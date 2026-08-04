const baseUrl = process.env.CREW_BASE_URL ?? "http://127.0.0.1:3000";
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminPassword) {
  throw new Error("ADMIN_PASSWORD is required.");
}

let adminCookie = "";
const createdRoomIds = [];

async function request(path, init = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(adminCookie ? { Cookie: adminCookie } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body =
    response.status === 204
      ? null
      : await response.json().catch(() => null);
  return { body, response };
}

async function expectOk(path, init = {}) {
  const result = await request(path, init);
  if (!result.response.ok) {
    const message =
      result.body?.error?.message ??
      result.body?.message ??
      `${result.response.status} ${result.response.statusText}`;
    throw new Error(`${init.method ?? "GET"} ${path}: ${message}`);
  }
  return result;
}

async function adminJson(path, method, input) {
  return (
    await expectOk(path, {
      method,
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    })
  ).body;
}

async function playerProjection(roomName, playerName) {
  return (
    await expectOk(`/api/rooms/${encodeURIComponent(roomName)}`, {
      headers: { "X-Crew-Player-Name": playerName },
    })
  ).body;
}

async function playerAction(roomName, playerName, command) {
  return (
    await expectOk(`/api/rooms/${encodeURIComponent(roomName)}/actions`, {
      method: "POST",
      headers: { "X-Crew-Player-Name": playerName },
      body: JSON.stringify(command),
    })
  ).body;
}

async function main() {
  const session = await request("/api/admin/session", {
    method: "POST",
    body: JSON.stringify({ password: adminPassword }),
  });
  if (!session.response.ok) {
    throw new Error("Admin login failed.");
  }
  const setCookie = session.response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Admin login did not set a session cookie.");
  }
  adminCookie = setCookie.split(";", 1)[0];
  console.log("✓ Admin session");

  const roomName = `Smoke-${Date.now().toString(36)}`;
  let room = (
    await adminJson("/api/admin/rooms", "POST", {
      name: roomName,
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    })
  ).room;
  createdRoomIds.push(room.id);
  console.log("✓ Room created");

  for (const displayName of ["Ada", "Grace", "Katherine"]) {
    room = (
      await adminJson(`/api/admin/rooms/${room.id}/players`, "POST", {
        displayName,
      })
    ).room;
  }
  if (room.players.length !== 3) {
    throw new Error("The smoke room does not have three players.");
  }
  console.log("✓ Three named players");

  const credentials = new Map(
    room.players.map((player) => [
      player.id,
      { name: player.displayName },
    ]),
  );
  for (const credential of credentials.values()) {
    await expectOk("/api/rooms/login", {
      method: "POST",
      body: JSON.stringify({
        roomName,
        playerName: credential.name,
      }),
    });
  }
  console.log("✓ Three player logins");

  let projection = await playerAction(
    roomName,
    credentials.values().next().value.name,
    { type: "start-mission" },
  );
  if (
    projection.players.some((player) =>
      Object.prototype.hasOwnProperty.call(player, "hand"),
    )
  ) {
    throw new Error("A player projection leaked another hand.");
  }
  console.log("✓ Actor-specific projection privacy");

  const taskSelectors = Array.from(credentials.values());
  for (let turn = 0; projection.phase === "assigning-tasks"; turn += 1) {
    if (turn > 10) {
      throw new Error("Task assignment did not converge.");
    }
    const credential = taskSelectors[turn % taskSelectors.length];
    if (!credential) {
      throw new Error("Could not resolve a task selector.");
    }
    projection = await playerProjection(roomName, credential.name);
    const taskId = projection.legalActions.claimableTaskIds[0];
    if (!taskId) {
      throw new Error("The task selector has no claimable task.");
    }
    projection = await playerAction(roomName, credential.name, {
      type: "claim-task",
      taskId,
    });
  }
  console.log("✓ Task assignment");

  if (projection.tasks.length > 0) {
    if (projection.phase !== "ready-to-start-trick") {
      throw new Error("Task assignment did not wait for Start Trick.");
    }
    projection = await playerAction(
      roomName,
      taskSelectors[0].name,
      { type: "start-trick" },
    );
    if (projection.phase !== "between-tricks") {
      throw new Error("Start Trick did not enter gameplay.");
    }
  }
  console.log("✓ Start trick confirmation");

  for (let play = 0; !projection.lastTrick; play += 1) {
    if (play > 5) {
      throw new Error("A complete trick did not converge.");
    }
    const current = projection.players.find((player) => player.isCurrent);
    const credential = current && credentials.get(current.id);
    if (!credential) {
      throw new Error("Could not resolve the current card player.");
    }
    projection = await playerProjection(roomName, credential.name);
    const cardId = projection.legalActions.playableCardIds[0];
    if (!cardId) {
      throw new Error("The current player has no legal card.");
    }
    projection = await playerAction(roomName, credential.name, {
      type: "play-card",
      cardId,
    });
  }
  console.log("✓ One complete trick");

  const firstCredential = credentials.values().next().value;
  projection = await playerProjection(
    roomName,
    firstCredential.name,
  );
  projection = await playerAction(roomName, firstCredential.name, {
    type: "set-task-outcome",
    taskId: projection.tasks[0].id,
    outcome: "success",
  });
  if (projection.phase !== "between-tricks" || projection.result !== null) {
    throw new Error("Setting a task status ended the mission prematurely.");
  }
  const commander = projection.players.find((player) => player.isCaptain);
  const commanderCredential = commander && credentials.get(commander.id);
  if (!commanderCredential) {
    throw new Error("Could not resolve the commander.");
  }
  projection = await playerProjection(roomName, commanderCredential.name);
  if (!projection.legalActions.canSetMissionOutcome) {
    throw new Error("The commander could not record the completed mission.");
  }
  projection = await playerAction(roomName, commanderCredential.name, {
    type: "set-mission-outcome",
    outcome: "success",
  });
  if (projection.phase !== "finished" || projection.result !== "won") {
    throw new Error("Commander adjudication did not win the mission.");
  }
  console.log("✓ Commander-confirmed victory");

  room = (
    await adminJson(`/api/admin/rooms/${room.id}/actions`, "POST", {
      type: "advance",
    })
  ).room;
  if (room.missionNumber !== 2) {
    throw new Error("Sparse configured advancement did not reach Mission 2.");
  }
  if (room.phase !== "preflight") {
    throw new Error("Advancement did not return the room to preflight.");
  }
  const advancedAttempt = room.attemptNumber;
  projection = await playerAction(roomName, firstCredential.name, {
    type: "start-mission",
  });
  if (projection.phase === "preflight") {
    throw new Error("A player could not start the advanced mission.");
  }
  room = (
    await adminJson(`/api/admin/rooms/${room.id}/actions`, "POST", {
      type: "return-to-preflight",
    })
  ).room;
  if (room.attemptNumber !== advancedAttempt + 1) {
    throw new Error("Reset did not increment the attempt number.");
  }
  if (room.phase !== "preflight") {
    throw new Error("Reset did not return the room to preflight.");
  }
  console.log("✓ Advance, player start, and return to preflight");
}

try {
  await main();
  console.log("Crew smoke test passed.");
} finally {
  for (const roomId of createdRoomIds.reverse()) {
    await request(`/api/admin/rooms/${roomId}`, { method: "DELETE" }).catch(
      () => undefined,
    );
  }
}
