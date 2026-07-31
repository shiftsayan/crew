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

async function playerProjection(roomName, roomKey, playerKey) {
  return (
    await expectOk(`/api/rooms/${encodeURIComponent(roomName)}`, {
      headers: {
        "X-Crew-Room-Key": roomKey,
        "X-Crew-Player-Key": playerKey,
      },
    })
  ).body;
}

async function playerAction(roomName, roomKey, playerKey, command) {
  return (
    await expectOk(`/api/rooms/${encodeURIComponent(roomName)}/actions`, {
      method: "POST",
      headers: {
        "X-Crew-Room-Key": roomKey,
        "X-Crew-Player-Key": playerKey,
      },
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
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(room.roomKey)) {
    throw new Error("The smoke room does not have a valid room key.");
  }
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
  console.log("✓ Three unique player keys");

  const rotatedPlayer = room.players[0];
  room = (
    await adminJson(
      `/api/admin/rooms/${room.id}/players/${rotatedPlayer.id}/rotate-key`,
      "POST",
    )
  ).room;
  const rotated = room.players.find(
    (player) => player.id === rotatedPlayer.id,
  );
  if (!rotated || rotated.playerKey === rotatedPlayer.playerKey) {
    throw new Error("Player key rotation did not replace the key.");
  }
  const oldLogin = await request("/api/rooms/login", {
    method: "POST",
    body: JSON.stringify({
      roomKey: room.roomKey,
      playerKey: rotatedPlayer.playerKey,
    }),
  });
  if (oldLogin.response.status !== 401) {
    throw new Error("A rotated player key still works.");
  }
  console.log("✓ Player key rotation invalidates the old key");

  const oldRoomKey = room.roomKey;
  room = (
    await adminJson(
      `/api/admin/rooms/${room.id}/rotate-key`,
      "POST",
    )
  ).room;
  if (room.roomKey === oldRoomKey) {
    throw new Error("Room key rotation did not replace the key.");
  }
  const oldRoomLogin = await request("/api/rooms/login", {
    method: "POST",
    body: JSON.stringify({
      roomKey: oldRoomKey,
      playerKey: room.players[0].playerKey,
    }),
  });
  if (oldRoomLogin.response.status !== 401) {
    throw new Error("A rotated room key still works.");
  }
  console.log("✓ Room key rotation invalidates the old key");

  const credentials = new Map(
    room.players.map((player) => [
      player.id,
      { key: player.playerKey, name: player.displayName },
    ]),
  );
  for (const credential of credentials.values()) {
    await expectOk("/api/rooms/login", {
      method: "POST",
      body: JSON.stringify({
        roomKey: room.roomKey,
        playerKey: credential.key,
      }),
    });
  }
  console.log("✓ Three player logins");

  room = (
    await adminJson(`/api/admin/rooms/${room.id}/actions`, "POST", {
      type: "start",
    })
  ).room;

  let projection = await playerProjection(
    roomName,
    room.roomKey,
    credentials.values().next().value.key,
  );
  if (
    projection.players.some((player) =>
      Object.prototype.hasOwnProperty.call(player, "hand"),
    ) ||
    JSON.stringify(projection).includes("playerKey") ||
    JSON.stringify(projection).includes("roomKey")
  ) {
    throw new Error("A player projection leaked another hand or access key.");
  }
  console.log("✓ Actor-specific projection privacy");

  for (let turn = 0; projection.phase === "assigning-tasks"; turn += 1) {
    if (turn > 10) {
      throw new Error("Task assignment did not converge.");
    }
    const current = projection.players.find((player) => player.isCurrent);
    const credential = current && credentials.get(current.id);
    if (!credential) {
      throw new Error("Could not resolve the current task selector.");
    }
    projection = await playerProjection(roomName, room.roomKey, credential.key);
    projection =
      projection.legalActions.claimableTaskIds.length > 0
        ? await playerAction(roomName, room.roomKey, credential.key, {
            type: "claim-task",
            taskId: projection.legalActions.claimableTaskIds[0],
          })
        : await playerAction(roomName, room.roomKey, credential.key, {
            type: "pass-task",
          });
  }
  console.log("✓ Task assignment");

  for (let play = 0; !projection.lastTrick; play += 1) {
    if (play > 5) {
      throw new Error("A complete trick did not converge.");
    }
    const current = projection.players.find((player) => player.isCurrent);
    const credential = current && credentials.get(current.id);
    if (!credential) {
      throw new Error("Could not resolve the current card player.");
    }
    projection = await playerProjection(roomName, room.roomKey, credential.key);
    const cardId = projection.legalActions.playableCardIds[0];
    if (!cardId) {
      throw new Error("The current player has no legal card.");
    }
    projection = await playerAction(roomName, room.roomKey, credential.key, {
      type: "play-card",
      cardId,
    });
  }
  console.log("✓ One complete trick");

  const firstCredential = credentials.values().next().value;
  projection = await playerProjection(
    roomName,
    room.roomKey,
    firstCredential.key,
  );
  projection = await playerAction(roomName, room.roomKey, firstCredential.key, {
    type: "set-task-outcome",
    taskId: projection.tasks[0].id,
    outcome: "success",
  });
  if (projection.phase !== "finished" || projection.result !== "won") {
    throw new Error("Manual task adjudication did not win the mission.");
  }
  console.log("✓ Manual victory");

  room = (
    await adminJson(`/api/admin/rooms/${room.id}/actions`, "POST", {
      type: "advance",
    })
  ).room;
  if (room.missionNumber !== 2) {
    throw new Error("Sparse configured advancement did not reach Mission 2.");
  }
  const advancedAttempt = room.attemptNumber;
  room = (
    await adminJson(`/api/admin/rooms/${room.id}/actions`, "POST", {
      type: "restart",
    })
  ).room;
  if (room.attemptNumber !== advancedAttempt + 1) {
    throw new Error("Restart did not increment the attempt number.");
  }
  console.log("✓ Advance and fresh restart");
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
