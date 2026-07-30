import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

type EditionKey = "planet-nine" | "deep-sea";

type AdminPlayer = {
  id: string;
  displayName: string;
  loginKey: string;
  seat: number;
};

type AdminRoom = {
  id: string;
  name: string;
  editionKey: EditionKey;
  missionKey: string;
  missionNumber: number;
  attemptNumber: number;
  phase: string;
  result: string | null;
  players: AdminPlayer[];
};

type ProjectionPlayer = {
  id: string;
  displayName: string;
  cardCount: number;
  isCurrent: boolean;
  communication: {
    cardId: string;
    qualifier: string;
  } | null;
};

type Projection = {
  room: { id: string; name: string };
  mission: {
    editionKey: EditionKey;
    missionKey: string;
    number: number;
    attemptNumber: number;
  };
  phase: string;
  result: "won" | "lost" | null;
  self: {
    id: string;
    displayName: string;
    hand: Array<{ id: string }>;
  };
  players: ProjectionPlayer[];
  tasks: Array<{
    id: string;
    outcome: "pending" | "success" | "failure";
  }>;
  currentTrick: {
    number: number;
    plays: Array<{ playerId: string; cardId: string }>;
  } | null;
  lastTrick: {
    number: number;
    plays: Array<{ playerId: string; cardId: string }>;
    winnerPlayerId: string | null;
  } | null;
  legalActions: {
    claimableTaskIds: string[];
    canPassTask: boolean;
    playableCardIds: string[];
    communicationOptions: Array<{
      cardId: string;
      qualifiers: string[];
    }>;
    taskOutcomeTaskIds: string[];
    canSetMissionOutcome: boolean;
  };
};

type PlayerSession = {
  context: BrowserContext;
  page: Page;
  player: AdminPlayer;
};

type Scenario = {
  editionKey: EditionKey;
  label: string;
  missionKey: string;
  nextMissionNumber: number;
  playerCount: 3 | 4 | 5;
  victory: "task" | "manual";
};

const scenarios: Scenario[] = [
  {
    editionKey: "planet-nine",
    label: "Planet Nine",
    missionKey: "planet-nine:1",
    nextMissionNumber: 2,
    playerCount: 3,
    victory: "task",
  },
  {
    editionKey: "planet-nine",
    label: "Planet Nine",
    missionKey: "planet-nine:1",
    nextMissionNumber: 2,
    playerCount: 4,
    victory: "task",
  },
  {
    editionKey: "planet-nine",
    label: "Planet Nine",
    missionKey: "planet-nine:4",
    nextMissionNumber: 6,
    playerCount: 5,
    victory: "task",
  },
  {
    editionKey: "deep-sea",
    label: "Deep Sea",
    missionKey: "deep-sea:8",
    nextMissionNumber: 9,
    playerCount: 3,
    victory: "manual",
  },
  {
    editionKey: "deep-sea",
    label: "Deep Sea",
    missionKey: "deep-sea:1",
    nextMissionNumber: 2,
    playerCount: 4,
    victory: "task",
  },
  {
    editionKey: "deep-sea",
    label: "Deep Sea",
    missionKey: "deep-sea:1",
    nextMissionNumber: 2,
    playerCount: 5,
    victory: "task",
  },
];

const adminPassword =
  process.env.ADMIN_PASSWORD ?? "crew-e2e-admin-password";

async function responseBody(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function expectOk<T>(response: APIResponse): Promise<T> {
  const body = await responseBody(response);
  expect(
    response.ok(),
    `${response.url()} returned ${response.status()}: ${JSON.stringify(body)}`,
  ).toBe(true);
  return body as T;
}

async function adminLogin(request: APIRequestContext) {
  await expectOk(
    await request.post("/api/admin/session", {
      data: { password: adminPassword },
    }),
  );
}

async function adminPost<T>(
  request: APIRequestContext,
  path: string,
  data: unknown,
): Promise<T> {
  return expectOk<T>(await request.post(path, { data }));
}

async function createRoom(
  request: APIRequestContext,
  input: {
    name: string;
    editionKey: EditionKey;
    missionKey: string;
    playerCount: number;
  },
): Promise<AdminRoom> {
  let room = (
    await adminPost<{ room: AdminRoom }>(request, "/api/admin/rooms", {
      name: input.name,
      editionKey: input.editionKey,
      missionKey: input.missionKey,
    })
  ).room;

  for (let index = 0; index < input.playerCount; index += 1) {
    room = (
      await adminPost<{ room: AdminRoom }>(
        request,
        `/api/admin/rooms/${room.id}/players`,
        { displayName: `Player ${index + 1}` },
      )
    ).room;
  }

  return room;
}

async function adminAction(
  request: APIRequestContext,
  roomId: string,
  type: "start" | "restart" | "advance",
): Promise<AdminRoom> {
  return (
    await adminPost<{ room: AdminRoom }>(
      request,
      `/api/admin/rooms/${roomId}/actions`,
      { type },
    )
  ).room;
}

function roomApiPath(roomName: string): string {
  return `/api/rooms/${encodeURIComponent(roomName)}`;
}

async function getProjection(
  session: PlayerSession,
  roomName: string,
): Promise<Projection> {
  return expectOk<Projection>(
    await session.context.request.get(roomApiPath(roomName), {
      headers: { "X-Crew-Player-Key": session.player.loginKey },
    }),
  );
}

async function sendAction(
  session: PlayerSession,
  roomName: string,
  command: unknown,
): Promise<Projection> {
  return expectOk<Projection>(
    await session.context.request.post(`${roomApiPath(roomName)}/actions`, {
      data: command,
      headers: { "X-Crew-Player-Key": session.player.loginKey },
    }),
  );
}

function sessionForPlayer(
  sessions: PlayerSession[],
  playerId: string,
): PlayerSession {
  const session = sessions.find((candidate) => candidate.player.id === playerId);
  if (!session) {
    throw new Error(`No browser context exists for player ${playerId}.`);
  }
  return session;
}

async function openPlayerSessions(
  browser: Browser,
  baseURL: string,
  room: AdminRoom,
): Promise<PlayerSession[]> {
  return Promise.all(
    room.players.map(async (player) => {
      const context = await browser.newContext({ baseURL });
      await context.addInitScript(
        ({ key, name }) => {
          window.localStorage.setItem(
            `crew:credentials:${name.toLowerCase()}`,
            JSON.stringify({ roomName: name, key }),
          );
        },
        { key: player.loginKey, name: room.name },
      );

      const login = await expectOk<{
        player: { id: string };
        room: { id: string };
      }>(
        await context.request.post("/api/rooms/login", {
          data: { roomName: room.name, key: player.loginKey },
        }),
      );
      expect(login.player.id).toBe(player.id);
      expect(login.room.id).toBe(room.id);

      const page = await context.newPage();
      await page.goto(`/rooms/${encodeURIComponent(room.name)}`);
      await expect(
        page.getByRole("heading", { name: "Waiting for the room admin" }),
      ).toBeVisible();

      const savedCredentials = await page.evaluate(() =>
        Object.fromEntries(
          Object.entries(window.localStorage).filter(([key]) =>
            key.startsWith("crew:credentials:"),
          ),
        ),
      );
      expect(savedCredentials).toEqual({
        [`crew:credentials:${room.name.toLowerCase()}`]: JSON.stringify({
          roomName: room.name,
          key: player.loginKey,
        }),
      });

      return { context, page, player };
    }),
  );
}

async function assignTasks(
  roomName: string,
  sessions: PlayerSession[],
  exercisePass: boolean,
): Promise<Projection> {
  let projection = await getProjection(sessions[0], roomName);

  for (let turn = 0; projection.phase === "assigning-tasks"; turn += 1) {
    if (turn >= 12) {
      throw new Error("Task assignment did not finish within one selection round.");
    }

    const currentPlayer = projection.players.find((player) => player.isCurrent);
    if (!currentPlayer) {
      throw new Error("The task selector projection has no current player.");
    }
    const actor = sessionForPlayer(sessions, currentPlayer.id);
    const actorProjection = await getProjection(actor, roomName);

    if (
      exercisePass &&
      turn === 0 &&
      actorProjection.legalActions.canPassTask
    ) {
      projection = await sendAction(actor, roomName, { type: "pass-task" });
    } else if (actorProjection.legalActions.claimableTaskIds.length > 0) {
      projection = await sendAction(actor, roomName, {
        type: "claim-task",
        taskId: actorProjection.legalActions.claimableTaskIds[0],
      });
    } else if (actorProjection.legalActions.canPassTask) {
      projection = await sendAction(actor, roomName, { type: "pass-task" });
    } else {
      throw new Error("The current selector can neither claim nor pass.");
    }
  }

  return projection;
}

async function communicateOnce(
  roomName: string,
  sessions: PlayerSession[],
): Promise<Projection> {
  for (const session of sessions) {
    const projection = await getProjection(session, roomName);
    const option = projection.legalActions.communicationOptions[0];
    if (!option) continue;

    const next = await sendAction(session, roomName, {
      type: "communicate",
      cardId: option.cardId,
      qualifier: option.qualifiers[0],
    });
    expect(
      next.players.find((player) => player.id === session.player.id)
        ?.communication,
    ).toEqual({
      cardId: option.cardId,
      qualifier: option.qualifiers[0],
    });
    return next;
  }

  throw new Error("No player received a legal communication option.");
}

async function playCompleteTrick(
  roomName: string,
  sessions: PlayerSession[],
): Promise<Projection> {
  let projection = await getProjection(sessions[0], roomName);
  const previousTrickNumber = projection.lastTrick?.number ?? 0;

  for (let play = 0; play < sessions.length; play += 1) {
    const currentPlayer = projection.players.find((player) => player.isCurrent);
    if (!currentPlayer) {
      throw new Error("The trick projection has no current player.");
    }
    const actor = sessionForPlayer(sessions, currentPlayer.id);
    const actorProjection = await getProjection(actor, roomName);
    const cardId = actorProjection.legalActions.playableCardIds[0];
    if (!cardId) {
      throw new Error("The current player has no playable card.");
    }

    projection = await sendAction(actor, roomName, {
      type: "play-card",
      cardId,
    });
  }

  expect(projection.currentTrick).toBeNull();
  expect(projection.lastTrick?.number).toBe(previousTrickNumber + 1);
  expect(projection.lastTrick?.plays).toHaveLength(sessions.length);
  expect(projection.lastTrick?.winnerPlayerId).toBeTruthy();
  return projection;
}

async function finishMission(
  roomName: string,
  sessions: PlayerSession[],
  victory: Scenario["victory"],
): Promise<Projection> {
  const actor = sessions[0];
  let projection = await getProjection(actor, roomName);

  if (victory === "manual") {
    expect(projection.tasks).toHaveLength(0);
    expect(projection.legalActions.canSetMissionOutcome).toBe(true);
    projection = await sendAction(actor, roomName, {
      type: "set-mission-outcome",
      outcome: "success",
    });
  } else {
    expect(projection.tasks.length).toBeGreaterThan(0);
    for (const task of projection.tasks) {
      projection = await sendAction(actor, roomName, {
        type: "set-task-outcome",
        taskId: task.id,
        outcome: "success",
      });
    }
  }

  expect(projection.phase).toBe("finished");
  expect(projection.result).toBe("won");
  return projection;
}

async function assertWinningUiAndGuard(
  session: PlayerSession,
  room: AdminRoom,
  attemptNumber: number,
) {
  const storageKey = `crew:celebrated:${room.id}:${attemptNumber}`;
  await expect(
    session.page.getByRole("heading", { name: "Mission complete" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(session.page.getByText("Level complete")).toBeVisible();
  await expect
    .poll(
      () =>
        session.page.evaluate((key) => window.sessionStorage.getItem(key), storageKey),
      { timeout: 10_000 },
    )
    .toBe("true");

  await session.page.reload();
  await expect(
    session.page.getByRole("heading", { name: "Mission complete" }),
  ).toBeVisible();
  await expect(session.page.locator("canvas")).toHaveCount(0);
  expect(
    await session.page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      storageKey,
    ),
  ).toBe("true");
}

async function assertWrongAndCrossRoomKeys(
  request: APIRequestContext,
  room: AdminRoom,
  cleanupRoomIds: string[],
) {
  const wrongKey = room.players.some((player) => player.loginKey === "AAAAAA")
    ? "BBBBBB"
    : "AAAAAA";
  const wrongLogin = await request.post("/api/rooms/login", {
    data: { roomName: room.name, key: wrongKey },
  });
  expect(wrongLogin.status()).toBe(401);

  const decoy = await createRoom(request, {
    name: `Cross-${Date.now().toString(36)}`,
    editionKey: "planet-nine",
    missionKey: "planet-nine:1",
    playerCount: 1,
  });
  cleanupRoomIds.push(decoy.id);

  const firstCrossLogin = await request.post("/api/rooms/login", {
    data: { roomName: decoy.name, key: room.players[0].loginKey },
  });
  expect(firstCrossLogin.status()).toBe(401);
  const secondCrossLogin = await request.post("/api/rooms/login", {
    data: { roomName: room.name, key: decoy.players[0].loginKey },
  });
  expect(secondCrossLogin.status()).toBe(401);
}

async function rotateKeyAndReconnect(
  request: APIRequestContext,
  room: AdminRoom,
  session: PlayerSession,
) {
  const oldKey = session.player.loginKey;
  const updatedRoom = (
    await adminPost<{ room: AdminRoom }>(
      request,
      `/api/admin/rooms/${room.id}/players/${session.player.id}/rotate-key`,
      undefined,
    )
  ).room;
  const updatedPlayer = updatedRoom.players.find(
    (player) => player.id === session.player.id,
  );
  expect(updatedPlayer).toBeTruthy();
  expect(updatedPlayer?.loginKey).not.toBe(oldKey);

  const oldLogin = await request.post("/api/rooms/login", {
    data: { roomName: room.name, key: oldKey },
  });
  expect(oldLogin.status()).toBe(401);

  await session.page.reload();
  await expect(
    session.page.getByRole("heading", { name: `Join ${room.name}` }),
  ).toBeVisible();

  session.player.loginKey = updatedPlayer!.loginKey;
  await session.page.evaluate(
    ({ key, name }) => {
      window.localStorage.setItem(
        `crew:credentials:${name.toLowerCase()}`,
        JSON.stringify({ roomName: name, key }),
      );
    },
    { key: session.player.loginKey, name: room.name },
  );
  await session.page.reload();
  await expect(session.page.locator(".player-identity")).toHaveText(
    session.player.displayName,
  );
}

test.describe("database-backed multiplayer", () => {
  for (const scenario of scenarios) {
    test(`${scenario.label} supports ${scenario.playerCount} isolated players end to end`, async ({
      browser,
      request,
    }, testInfo) => {
      test.setTimeout(90_000);
      test.skip(
        process.env.CREW_RUN_DB_E2E !== "1",
        "Set CREW_RUN_DB_E2E=1 and start local Supabase to run multiplayer tests.",
      );

      const baseURL = testInfo.project.use.baseURL;
      if (typeof baseURL !== "string") {
        throw new Error("The Playwright project must define a base URL.");
      }

      const cleanupRoomIds: string[] = [];
      const sessions: PlayerSession[] = [];

      await adminLogin(request);
      const unique = `${Date.now().toString(36)}-${testInfo.workerIndex}-${testInfo.retry}`;
      const room = await createRoom(request, {
        name: `E2E-${scenario.editionKey === "deep-sea" ? "DS" : "PN"}${
          scenario.playerCount
        }-${unique}`,
        editionKey: scenario.editionKey,
        missionKey: scenario.missionKey,
        playerCount: scenario.playerCount,
      });
      cleanupRoomIds.push(room.id);

      try {
        if (scenario.editionKey === "planet-nine" && scenario.playerCount === 3) {
          await assertWrongAndCrossRoomKeys(request, room, cleanupRoomIds);
        }

        sessions.push(...(await openPlayerSessions(browser, baseURL, room)));

        await adminAction(request, room.id, "start");
        for (const session of sessions) {
          const projection = await getProjection(session, room.name);
          expect(projection.self.id).toBe(session.player.id);
          expect(JSON.stringify(projection)).not.toContain("loginKey");
          expect(
            projection.players.every(
              (player) => !Object.hasOwn(player, "hand"),
            ),
          ).toBe(true);
        }

        const assigned = await assignTasks(
          room.name,
          sessions,
          scenario.editionKey === "deep-sea" && scenario.playerCount === 5,
        );
        expect(assigned.phase).toBe("between-tricks");
        if (scenario.victory === "task") {
          expect(
            assigned.tasks.every((task) => task.outcome === "pending"),
          ).toBe(true);
        }

        await communicateOnce(room.name, sessions);
        await playCompleteTrick(room.name, sessions);
        const won = await finishMission(
          room.name,
          sessions,
          scenario.victory,
        );
        await assertWinningUiAndGuard(
          sessions[0],
          room,
          won.mission.attemptNumber,
        );

        const advanced = await adminAction(request, room.id, "advance");
        expect(advanced.missionNumber).toBe(scenario.nextMissionNumber);
        expect(advanced.attemptNumber).toBe(won.mission.attemptNumber + 1);
        const restarted = await adminAction(request, room.id, "restart");
        expect(restarted.attemptNumber).toBe(advanced.attemptNumber + 1);

        if (scenario.editionKey === "planet-nine" && scenario.playerCount === 3) {
          await rotateKeyAndReconnect(request, room, sessions[0]);
        } else {
          await sessions[0].page.reload();
          await expect(sessions[0].page.locator(".player-identity")).toHaveText(
            sessions[0].player.displayName,
          );
        }
      } finally {
        await Promise.allSettled(
          sessions.map((session) => session.context.close()),
        );
        for (const roomId of cleanupRoomIds.reverse()) {
          await request.delete(`/api/admin/rooms/${roomId}`).catch(() => undefined);
        }
      }
    });
  }
});

test.describe("database-backed browser gaps", () => {
  test("three players exhaust the deck into adjudication, then render failure without celebration", async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(
      process.env.CREW_RUN_DB_E2E !== "1",
      "Set CREW_RUN_DB_E2E=1 and start local Supabase to run multiplayer tests.",
    );

    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== "string") {
      throw new Error("The Playwright project must define a base URL.");
    }

    const sessions: PlayerSession[] = [];
    await adminLogin(request);
    const unique = `${Date.now().toString(36)}-${testInfo.workerIndex}-${testInfo.retry}`;
    const room = await createRoom(request, {
      name: `E2E-Adjudicate-${unique}`,
      editionKey: "deep-sea",
      missionKey: "deep-sea:8",
      playerCount: 3,
    });
    const roomId = room.id;

    try {
      sessions.push(...(await openPlayerSessions(browser, baseURL, room)));
      await adminAction(request, room.id, "start");

      let projection = await getProjection(sessions[0], room.name);
      expect(projection.tasks).toHaveLength(0);
      expect(projection.phase).toBe("between-tricks");

      let cardsPlayed = 0;
      while (
        projection.phase === "between-tricks" ||
        projection.phase === "playing-trick"
      ) {
        if (cardsPlayed >= 40) {
          throw new Error("The attempt did not reach adjudication after the deck was exhausted.");
        }

        const currentPlayer = projection.players.find((player) => player.isCurrent);
        if (!currentPlayer) {
          throw new Error("The active trick has no current player.");
        }
        const actor = sessionForPlayer(sessions, currentPlayer.id);
        const actorProjection = await getProjection(actor, room.name);
        const cardId = actorProjection.legalActions.playableCardIds[0];
        if (!cardId) {
          throw new Error("The current player has no playable card.");
        }

        projection = await sendAction(actor, room.name, {
          type: "play-card",
          cardId,
        });
        cardsPlayed += 1;
      }

      expect(cardsPlayed).toBe(39);
      expect(projection.phase).toBe("adjudicating");
      expect(projection.result).toBeNull();
      expect(projection.lastTrick?.number).toBe(13);
      expect(
        projection.players.reduce((total, player) => total + player.cardCount, 0),
      ).toBe(1);
      expect(projection.legalActions.canSetMissionOutcome).toBe(true);

      await sessions[0].page.reload();
      await expect(
        sessions[0].page.getByRole("heading", {
          name: "How did the mission go?",
        }),
      ).toBeVisible();

      const failed = await sendAction(sessions[0], room.name, {
        type: "set-mission-outcome",
        outcome: "failure",
      });
      expect(failed.phase).toBe("finished");
      expect(failed.result).toBe("lost");

      await expect(
        sessions[0].page.getByRole("heading", {
          name: "Mission unsuccessful",
        }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(sessions[0].page.getByText("Attempt complete")).toBeVisible();
      await expect(sessions[0].page.locator("canvas")).toHaveCount(0);
      expect(
        await sessions[0].page.evaluate(
          (key) => window.sessionStorage.getItem(key),
          `crew:celebrated:${room.id}:${failed.mission.attemptNumber}`,
        ),
      ).toBeNull();
    } finally {
      await Promise.allSettled(
        sessions.map((session) => session.context.close()),
      );
      await request
        .delete(`/api/admin/rooms/${roomId}`)
        .catch(() => undefined);
    }
  });

  test("admin signs in, creates a room, manages players and starts the mission", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    test.skip(
      process.env.CREW_RUN_DB_E2E !== "1",
      "Set CREW_RUN_DB_E2E=1 and start local Supabase to run admin UI tests.",
    );

    const unique = `${Date.now().toString(36)}-${testInfo.workerIndex}-${testInfo.retry}`;
    const roomName = `E2E-Admin-${unique}`;
    let roomId: string | undefined;

    try {
      await page.goto("/admin");
      await page.getByLabel("Admin password").fill(adminPassword);
      await page.getByRole("button", { name: "Enter mission control" }).click();
      await expect(
        page.getByRole("heading", { name: "Room admin" }),
      ).toBeVisible();

      await page.getByRole("button", { name: "+ New room" }).click();
      const createForm = page.locator(".create-room-form");
      await createForm.getByLabel("Room name").fill(roomName);
      await createForm.getByLabel("Edition").selectOption("planet-nine");
      await createForm.getByLabel("Mission").selectOption("planet-nine:1");

      const createdResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/api/admin/rooms",
      );
      await createForm.getByRole("button", { name: "Create" }).click();
      const created = (await (await createdResponse).json()) as {
        room: AdminRoom;
      };
      roomId = created.room.id;

      await expect(
        page.getByRole("heading", { name: roomName, exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Save settings" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Delete room" })).toBeVisible();

      for (const playerName of ["Ada", "Grace", "Katherine"]) {
        await page.getByLabel("New player").fill(playerName);
        await page.getByRole("button", { name: "Add player" }).click();
        await expect(
          page.getByLabel(`Login key for ${playerName}`),
        ).toHaveText(/[A-HJ-NP-Z2-9]{6}/);
      }

      await expect(page.getByRole("button", { name: "Rotate" })).toHaveCount(3);
      await expect(page.getByLabel(/^Seat for /)).toHaveCount(3);
      await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

      const firstPlayer = page.locator(".admin-player-row").first();
      await firstPlayer.getByLabel("Display name for seat 1").fill("Ada Lovelace");
      await firstPlayer.getByRole("button", { name: "Save" }).click();
      await expect(
        page.getByLabel("Display name for seat 1"),
      ).toHaveValue("Ada Lovelace");

      const oldKey = await page
        .getByLabel("Login key for Ada Lovelace")
        .textContent();
      page.once("dialog", (dialog) => dialog.accept());
      await page
        .locator(".admin-player-row")
        .first()
        .getByRole("button", { name: "Rotate" })
        .click();
      await expect(page.getByLabel("Login key for Ada Lovelace")).not.toHaveText(
        oldKey ?? "",
      );

      await expect(
        page.getByRole("button", { name: "Start mission" }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "Start mission" }).click();
      await expect(page.getByText("Mission started.")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Restart level" }),
      ).toBeVisible();
    } finally {
      if (roomId) {
        await page.context().request.delete(`/api/admin/rooms/${roomId}`);
      }
    }
  });
});
