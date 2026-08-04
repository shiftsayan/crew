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
  tags: string[];
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
  tags: string[];
  cardCount: number;
  isCaptain: boolean;
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
    tags: string[];
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
    canStartMission: boolean;
    canStartTrick: boolean;
    claimableTaskIds: string[];
    releasableTaskIds: string[];
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

async function adminPatch<T>(
  request: APIRequestContext,
  path: string,
  data: unknown,
): Promise<T> {
  return expectOk<T>(await request.patch(path, { data }));
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
        { displayName: `Player-${index + 1}` },
      )
    ).room;
  }

  return room;
}

async function adminAction(
  request: APIRequestContext,
  roomId: string,
  type: "return-to-preflight" | "advance",
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
      headers: { "X-Crew-Player-Name": session.player.displayName },
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
      headers: { "X-Crew-Player-Name": session.player.displayName },
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

      const login = await expectOk<{
        player: { id: string };
        room: { id: string };
      }>(
        await context.request.post("/api/rooms/login", {
          data: { roomName: room.name, playerName: player.displayName },
        }),
      );
      expect(login.player.id).toBe(player.id);
      expect(login.room.id).toBe(room.id);

      const page = await context.newPage();
      await page.goto(
        `/rooms/${encodeURIComponent(room.name)}?player=${encodeURIComponent(player.displayName)}`,
      );
      await expect(
        page.getByRole("button", { name: "Start Mission" }),
      ).toBeVisible();

      const savedCredentials = await page.evaluate(() =>
        Object.fromEntries(
          Object.entries(window.localStorage).filter(([key]) =>
            key.startsWith("crew:credentials:"),
          ),
        ),
      );
      expect(savedCredentials).toEqual({});

      return { context, page, player };
    }),
  );
}

async function assignTasks(
  roomName: string,
  sessions: PlayerSession[],
): Promise<Projection> {
  let projection = await getProjection(sessions[0], roomName);

  for (let turn = 0; projection.phase === "assigning-tasks"; turn += 1) {
    if (turn >= 12) {
      throw new Error("Task assignment did not finish within one selection round.");
    }

    const actor = sessions[turn % sessions.length];
    if (!actor) {
      throw new Error("Could not resolve a task selector.");
    }
    const actorProjection = await getProjection(actor, roomName);
    const taskId = actorProjection.legalActions.claimableTaskIds[0];
    if (!taskId) {
      throw new Error("The task selector has no claimable task.");
    }
    projection = await sendAction(actor, roomName, {
      type: "claim-task",
      taskId,
    });
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
  const commander = projection.players.find((player) => player.isCaptain);
  if (!commander) {
    throw new Error("The mission projection has no commander.");
  }
  const commanderSession = sessionForPlayer(sessions, commander.id);

  if (victory === "manual") {
    expect(projection.tasks).toHaveLength(0);
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

  projection = await getProjection(commanderSession, roomName);
  expect(projection.legalActions.canSetMissionOutcome).toBe(true);
  projection = await sendAction(commanderSession, roomName, {
    type: "set-mission-outcome",
    outcome: "success",
  });

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

async function assertWrongAndCrossRoomNames(
  request: APIRequestContext,
  room: AdminRoom,
  cleanupRoomIds: string[],
) {
  const wrongLogin = await request.post("/api/rooms/login", {
    data: { roomName: room.name, playerName: "UnknownPlayer" },
  });
  expect(wrongLogin.status()).toBe(401);
  const wrongRoomLogin = await request.post("/api/rooms/login", {
    data: {
      roomName: "UnknownRoom",
      playerName: room.players[0].displayName,
    },
  });
  expect(wrongRoomLogin.status()).toBe(401);

  const decoy = await createRoom(request, {
    name: `Cross-${Date.now().toString(36)}`,
    editionKey: "planet-nine",
    missionKey: "planet-nine:1",
    playerCount: 1,
  });
  cleanupRoomIds.push(decoy.id);

  const firstCrossLogin = await request.post("/api/rooms/login", {
    data: {
      roomName: decoy.name,
      playerName: room.players[0].displayName,
    },
  });
  expect(firstCrossLogin.status()).toBe(401);
  const secondCrossLogin = await request.post("/api/rooms/login", {
    data: {
      roomName: room.name,
      playerName: decoy.players[0].displayName,
    },
  });
  expect(secondCrossLogin.status()).toBe(401);
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
      let room = await createRoom(request, {
        name: `E2E-${scenario.editionKey === "deep-sea" ? "DS" : "PN"}${
          scenario.playerCount
        }-${unique}`,
        editionKey: scenario.editionKey,
        missionKey: scenario.missionKey,
        playerCount: scenario.playerCount,
      });
      cleanupRoomIds.push(room.id);
      room = (
        await adminPatch<{ room: AdminRoom }>(
          request,
          `/api/admin/rooms/${room.id}/players/${room.players[0].id}`,
          { tags: ["bug"] },
        )
      ).room;

      try {
        if (scenario.editionKey === "planet-nine" && scenario.playerCount === 3) {
          await assertWrongAndCrossRoomNames(request, room, cleanupRoomIds);
        }

        sessions.push(...(await openPlayerSessions(browser, baseURL, room)));

        const started = await sendAction(sessions[0], room.name, {
          type: "start-mission",
        });
        expect(started.phase).not.toBe("preflight");
        for (const session of sessions) {
          const projection = await getProjection(session, room.name);
          expect(projection.self.id).toBe(session.player.id);
          expect(projection.self.tags).toEqual(
            session.player.id === room.players[0].id ? ["bug"] : [],
          );
          expect(
            projection.players.find(
              (player) => player.id === room.players[0].id,
            )?.tags,
          ).toEqual(["bug"]);
          expect(
            projection.players.every(
              (player) => !Object.hasOwn(player, "hand"),
            ),
          ).toBe(true);
        }

        const assigned = await assignTasks(room.name, sessions);
        expect(assigned.phase).toBe("ready-to-start-trick");
        expect(assigned.legalActions.canStartTrick).toBe(true);
        expect(assigned.players.every((player) => !player.isCurrent)).toBe(
          true,
        );
        if (scenario.victory === "task") {
          expect(
            assigned.tasks.every((task) => task.outcome === "pending"),
          ).toBe(true);
        }

        const readyToPlay = await sendAction(sessions[1], room.name, {
          type: "start-trick",
        });
        expect(readyToPlay.phase).toBe("between-tricks");
        const nextLeader = readyToPlay.players.find((player) => player.isCurrent);
        if (!nextLeader) {
          throw new Error("The between-tricks projection has no next leader.");
        }
        const leaderSession = sessionForPlayer(sessions, nextLeader.id);
        expect(
          (await getProjection(leaderSession, room.name)).legalActions
            .canStartTrick,
        ).toBe(true);

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
        expect(advanced.phase).toBe("preflight");
        const advancedStarted = await sendAction(
          sessions[0],
          room.name,
          { type: "start-mission" },
        );
        expect(advancedStarted.phase).not.toBe("preflight");
        const reset = await adminAction(request, room.id, "return-to-preflight");
        expect(reset.phase).toBe("preflight");
        expect(reset.attemptNumber).toBe(advanced.attemptNumber + 1);

        await sessions[0].page.reload();
        await expect(
          sessions[0].page.getByText(
            `${room.name} · ${sessions[0].player.displayName} · Live`,
            { exact: true },
          ),
        ).toBeVisible();
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
      await sendAction(sessions[0], room.name, {
        type: "start-mission",
      });

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
      const commander = projection.players.find((player) => player.isCaptain);
      if (!commander) {
        throw new Error("The adjudicating projection has no commander.");
      }
      const commanderSession = sessionForPlayer(sessions, commander.id);
      projection = await getProjection(commanderSession, room.name);
      expect(projection.legalActions.canSetMissionOutcome).toBe(true);

      await commanderSession.page.reload();
      await expect(
        commanderSession.page.getByRole("heading", {
          name: "How did the mission go?",
        }),
      ).toBeVisible();

      const failed = await sendAction(commanderSession, room.name, {
        type: "set-mission-outcome",
        outcome: "failure",
      });
      expect(failed.phase).toBe("finished");
      expect(failed.result).toBe("lost");

      await expect(
        commanderSession.page.getByRole("heading", {
          name: "Mission unsuccessful",
        }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(commanderSession.page.getByText("Attempt complete")).toBeVisible();
      await expect(commanderSession.page.locator("canvas")).toHaveCount(0);
      expect(
        await commanderSession.page.evaluate(
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

  test("admin signs in, creates a room, and manages its players and level", async ({
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
      await page.getByLabel("Admin Password").fill(adminPassword);
      await page.getByRole("button", { name: "Enter" }).click();
      const adminLogo = page.getByLabel("Crew administration");
      await expect(adminLogo).toBeVisible();
      const logoFontSizes = await adminLogo.evaluate((logo) => {
        const icon = logo.querySelector('[data-slot="crew-logo-icon"]');
        const text = logo.querySelector('[data-slot="crew-logo-text"]');
        return [
          icon ? window.getComputedStyle(icon).fontSize : null,
          text ? window.getComputedStyle(text).fontSize : null,
        ];
      });
      expect(logoFontSizes[0]).toBe(logoFontSizes[1]);

      await page.getByRole("button", { name: "New room" }).click();
      const createForm = page.getByRole("form", { name: "Create room" });
      await createForm.getByLabel("Room name").fill(roomName);
      await createForm
        .getByRole("combobox", { name: "Edition", exact: true })
        .click();
      await page.getByRole("option", { name: /Planet Nine/ }).click();
      await createForm
        .getByRole("combobox", { name: "Mission", exact: true })
        .click();
      await page.getByRole("option", { name: /^1 ·/ }).click();

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
        page.locator('[data-slot="admin-room-title-name"]'),
      ).toHaveText(roomName);
      await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Delete Room" })).toBeVisible();

      for (const [seat, playerName] of [
        [1, "Ada"],
        [2, "Grace"],
        [3, "Katherine"],
      ] as const) {
        await page
          .getByLabel(`Display name for player ${seat}`)
          .fill(playerName);
      }

      await expect(page.locator("[data-admin-player-row]")).toHaveCount(5);
      await expect(
        page.locator('[data-admin-player-row][data-empty="true"]'),
      ).toHaveCount(2);
      await expect(page.getByRole("button", { name: "Add player" })).toHaveCount(0);

      const firstPlayer = page.locator("[data-admin-player-row]").first();
      await firstPlayer
        .getByLabel("Display name for player 1")
        .fill("Ada_Lovelace");
      await expect(
        page.getByLabel("Display name for player 1"),
      ).toHaveValue("Ada_Lovelace");
      await expect(
        page.locator(
          '[data-player-color], [data-slot="admin-player-color"], [data-slot="admin-player-color-square"]',
        ),
      ).toHaveCount(0);

      await expect(page.getByRole("button", { name: "Start Mission" })).toHaveCount(0);
      await expect(
        page.getByText("Any player can start this mission from the room."),
      ).toHaveCount(0);
      await page
        .getByRole("combobox", { name: "Mission", exact: true })
        .click();
      await page.getByRole("option", { name: /^2 ·/ }).click();
      await page.getByRole("button", { name: "Save" }).click();
      await expect(
        page.getByText("Room settings saved", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Return to preflight" }),
      ).toBeVisible();
    } finally {
      if (roomId) {
        await page.context().request.delete(`/api/admin/rooms/${roomId}`);
      }
    }
  });
});
