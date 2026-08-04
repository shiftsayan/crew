import { describe, expect, it } from "vitest";
import {
  CARD_IDS,
  DEEP_SEA_MISSIONS,
  DEEP_SEA_TASKS,
  NON_TRUMP_CARD_IDS,
  applyPlayerCommand,
  createPreflightState,
  determineTrickWinner,
  getCommunicationQualifiers,
  getPlayableCardIds,
  startAttempt,
  type CardId,
  type GameState,
  type MissionKey,
  type TransitionResult,
} from "..";

const PLAYER_IDS = ["p1", "p2", "p3", "p4", "p5"];

function stateFrom(result: TransitionResult): GameState {
  if (!result.ok) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }
  return result.state;
}

function start(
  editionKey: "planet-nine" | "deep-sea",
  missionKey: MissionKey,
  playerCount = 3,
  deckOrder: CardId[] = [...CARD_IDS],
): GameState {
  const preflight = createPreflightState({ editionKey, missionKey });
  return stateFrom(
    startAttempt(preflight, {
      playerIds: PLAYER_IDS.slice(0, playerCount),
      deckOrder,
      taskOrder:
        editionKey === "planet-nine"
          ? [...NON_TRUMP_CARD_IDS]
          : DEEP_SEA_TASKS.map((task) => task.id),
    }),
  );
}

function assignAllTasks(initialState: GameState): GameState {
  let state = initialState;
  while (state.phase === "assigning-tasks") {
    const task = state.tasks.find((candidate) => !candidate.ownerPlayerId);
    const actor = state.seatOrder[state.assignmentTurns % state.seatOrder.length];
    if (!task || !actor) {
      throw new Error("Invalid task assignment fixture.");
    }
    state = stateFrom(
      applyPlayerCommand(state, actor, {
        type: "claim-task",
        taskId: task.id,
      }),
    );
  }
  if (state.phase === "ready-to-start-trick") {
    const actor = state.seatOrder[0];
    if (!actor) {
      throw new Error("Invalid trick-start fixture.");
    }
    state = stateFrom(applyPlayerCommand(state, actor, { type: "start-trick" }));
  }
  return state;
}

function deckWithPlacements(
  placements: Readonly<Record<number, CardId>>,
): CardId[] {
  const reserved = new Set(Object.values(placements));
  const remaining = CARD_IDS.filter((cardId) => !reserved.has(cardId));
  let cursor = 0;
  return Array.from({ length: CARD_IDS.length }, (_, index) => {
    const placed = placements[index];
    if (placed) {
      return placed;
    }
    const card = remaining[cursor];
    cursor += 1;
    return card;
  });
}

function expectCardConservation(state: GameState): void {
  const cardsInLiveZones = [
    ...state.seatOrder.flatMap((playerId) => state.players[playerId].hand),
    ...state.seatOrder.flatMap((playerId) => state.players[playerId].captured),
    ...(state.currentTrick?.plays.map((play) => play.cardId) ?? []),
  ];

  expect(cardsInLiveZones).toHaveLength(CARD_IDS.length);
  expect(new Set(cardsInLiveZones).size).toBe(CARD_IDS.length);
  expect([...cardsInLiveZones].sort()).toEqual([...CARD_IDS].sort());
}

describe("attempt start", () => {
  it.each([
    [3, [14, 13, 13]],
    [4, [10, 10, 10, 10]],
    [5, [8, 8, 8, 8, 8]],
  ] as const)("deals all cards across %i players", (playerCount, sizes) => {
    const state = start("planet-nine", "planet-nine:1", playerCount);
    expect(
      state.seatOrder.map((playerId) => state.players[playerId].hand.length),
    ).toEqual(sizes);
    expect(
      state.seatOrder.flatMap((playerId) => state.players[playerId].hand),
    ).toHaveLength(40);
    expect(
      state.players[state.captainPlayerId as string].hand,
    ).toContain("trump-4");
  });

  it("rejects duplicate or incomplete deck input", () => {
    const preflight = createPreflightState({
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    });
    const result = startAttempt(preflight, {
      playerIds: PLAYER_IDS.slice(0, 3),
      deckOrder: [...CARD_IDS.slice(0, 39), CARD_IDS[0]],
      taskOrder: [...NON_TRUMP_CARD_IDS],
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_PREFLIGHT" },
    });
  });

  it("selects an exact Deep Sea difficulty for every supported mission and player count", () => {
    for (const mission of DEEP_SEA_MISSIONS) {
      for (const playerCount of [3, 4, 5] as const) {
        const state = start(
          "deep-sea",
          mission.key,
          playerCount,
        );
        const difficulty = state.tasks.reduce(
          (total, task) => total + (task.difficulty ?? 0),
          0,
        );
        expect(difficulty, `${mission.key}/${playerCount}`).toBe(
          mission.taskBudget,
        );
      }
    }
  });
});

describe("task assignment", () => {
  it("waits for any player to start the first trick after assignment", () => {
    const state = start("planet-nine", "planet-nine:3");
    expect(state.currentPlayerId).toBe(state.captainPlayerId);
    expect(state.tasks.map((task) => task.order)).toEqual(["one", "two"]);

    const [firstActor, secondActor] = state.seatOrder.filter(
      (playerId) => playerId !== state.captainPlayerId,
    );
    if (!firstActor || !secondActor) {
      throw new Error("Expected two non-captain selectors.");
    }

    const afterFirst = stateFrom(
      applyPlayerCommand(state, firstActor, {
        type: "claim-task",
        taskId: state.tasks[1].id,
      }),
    );
    expect(afterFirst).toMatchObject({
      phase: "assigning-tasks",
      currentPlayerId: state.captainPlayerId,
      tasks: [
        { ownerPlayerId: null },
        { ownerPlayerId: firstActor },
      ],
    });

    const staleClaim = applyPlayerCommand(afterFirst, secondActor, {
      type: "claim-task",
      taskId: afterFirst.tasks[1].id,
    });
    expect(staleClaim).toMatchObject({
      ok: false,
      error: { code: "TASK_ALREADY_CLAIMED" },
    });
    expect(
      applyPlayerCommand(afterFirst, firstActor, { type: "start-trick" }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_PHASE" },
    });

    const afterSecond = stateFrom(
      applyPlayerCommand(afterFirst, secondActor, {
        type: "claim-task",
        taskId: afterFirst.tasks[0].id,
      }),
    );
    expect(afterSecond.phase).toBe("ready-to-start-trick");
    expect(afterSecond.currentPlayerId).toBeNull();
    expect(afterSecond.tasks.map((task) => task.ownerPlayerId)).toEqual([
      secondActor,
      firstActor,
    ]);
    expect(
      applyPlayerCommand(afterSecond, firstActor, {
        type: "claim-task",
        taskId: afterSecond.tasks[0].id,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_PHASE" },
    });
    expect(
      applyPlayerCommand(afterSecond, firstActor, {
        type: "play-card",
        cardId: afterSecond.players[firstActor].hand[0],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_PHASE" },
    });
    expect(
      applyPlayerCommand(afterSecond, firstActor, {
        type: "set-task-outcome",
        taskId: afterSecond.tasks[0].id,
        outcome: "success",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "OUTCOME_NOT_ALLOWED" },
    });

    const started = stateFrom(
      applyPlayerCommand(afterSecond, firstActor, { type: "start-trick" }),
    );
    expect(started.phase).toBe("between-tricks");
    expect(started.currentPlayerId).toBe(started.captainPlayerId);

    const staleStart = applyPlayerCommand(started, secondActor, {
      type: "start-trick",
    });
    expect(staleStart).toMatchObject({
      ok: false,
      error: { code: "INVALID_PHASE" },
    });
  });

  it("lets any player claim a Deep Sea task without passing", () => {
    const state = start("deep-sea", "deep-sea:1");
    expect(state.tasks).toHaveLength(1);

    const selector = state.seatOrder.find(
      (playerId) => playerId !== state.captainPlayerId,
    );
    if (!selector) {
      throw new Error("Expected a non-captain selector.");
    }

    const invalidPass = applyPlayerCommand(state, selector, {
      type: "pass-task",
    });
    expect(invalidPass).toMatchObject({
      ok: false,
      error: { code: "PASS_NOT_ALLOWED" },
    });

    const claimed = stateFrom(
      applyPlayerCommand(state, selector, {
        type: "claim-task",
        taskId: state.tasks[0].id,
      }),
    );
    expect(claimed.phase).toBe("ready-to-start-trick");
    expect(claimed.currentPlayerId).toBeNull();
    expect(claimed.tasks[0].ownerPlayerId).toBe(selector);

    const started = stateFrom(
      applyPlayerCommand(claimed, selector, { type: "start-trick" }),
    );
    expect(started.phase).toBe("between-tricks");
    expect(started.currentPlayerId).toBe(started.captainPlayerId);
  });

  it("lets a player deselect only their own task before the first trick", () => {
    let state = start("planet-nine", "planet-nine:3");
    const owner = state.seatOrder[0];
    const otherPlayer = state.seatOrder[1];
    const [firstTask, secondTask] = state.tasks;
    if (!owner || !otherPlayer || !firstTask || !secondTask) {
      throw new Error("Expected two tasks and two seated players.");
    }

    state = stateFrom(
      applyPlayerCommand(state, owner, {
        type: "claim-task",
        taskId: firstTask.id,
      }),
    );
    expect(state).toMatchObject({
      phase: "assigning-tasks",
      assignmentTurns: 1,
      tasks: [{ ownerPlayerId: owner }, { ownerPlayerId: null }],
    });
    expect(
      applyPlayerCommand(state, otherPlayer, {
        type: "release-task",
        taskId: firstTask.id,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "TASK_NOT_OWNED" },
    });

    state = stateFrom(
      applyPlayerCommand(state, owner, {
        type: "release-task",
        taskId: firstTask.id,
      }),
    );
    expect(state).toMatchObject({
      phase: "assigning-tasks",
      currentPlayerId: state.captainPlayerId,
      assignmentTurns: 0,
      tasks: [{ ownerPlayerId: null }, { ownerPlayerId: null }],
    });
    expect(
      applyPlayerCommand(state, owner, {
        type: "release-task",
        taskId: firstTask.id,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "TASK_NOT_OWNED" },
    });

    state = stateFrom(
      applyPlayerCommand(state, owner, {
        type: "claim-task",
        taskId: firstTask.id,
      }),
    );
    state = stateFrom(
      applyPlayerCommand(state, otherPlayer, {
        type: "claim-task",
        taskId: secondTask.id,
      }),
    );
    expect(state.phase).toBe("ready-to-start-trick");

    state = stateFrom(
      applyPlayerCommand(state, owner, {
        type: "release-task",
        taskId: firstTask.id,
      }),
    );
    expect(state).toMatchObject({
      phase: "assigning-tasks",
      currentPlayerId: state.captainPlayerId,
      assignmentTurns: 1,
      tasks: [{ ownerPlayerId: null }, { ownerPlayerId: otherPlayer }],
    });

    state = stateFrom(
      applyPlayerCommand(state, owner, {
        type: "claim-task",
        taskId: firstTask.id,
      }),
    );
    state = stateFrom(
      applyPlayerCommand(state, otherPlayer, { type: "start-trick" }),
    );
    expect(
      applyPlayerCommand(state, owner, {
        type: "release-task",
        taskId: firstTask.id,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_PHASE" },
    });
  });
});

describe("trick-taking rules", () => {
  it("lets only the next leader communicate, play, or explicitly begin an empty trick", () => {
    let state = assignAllTasks(start("planet-nine", "planet-nine:1"));
    const leader = state.currentPlayerId as string;
    const otherPlayer = state.seatOrder.find((playerId) => playerId !== leader);
    if (!otherPlayer) {
      throw new Error("Expected another seated player.");
    }

    expect(
      applyPlayerCommand(state, otherPlayer, { type: "begin-trick" }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOT_YOUR_TURN" },
    });

    const communication = state.players[leader].hand
      .map((cardId) => ({
        cardId,
        qualifier: getCommunicationQualifiers(state, leader, cardId)[0],
      }))
      .find(
        (
          option,
        ): option is {
          cardId: CardId;
          qualifier: "highest" | "only" | "lowest";
        } => option.qualifier !== undefined,
      );
    if (!communication) {
      throw new Error("Expected the next leader to have a legal communication.");
    }

    state = stateFrom(
      applyPlayerCommand(state, leader, {
        type: "communicate",
        cardId: communication.cardId,
        qualifier: communication.qualifier,
      }),
    );
    expect(state).toMatchObject({
      phase: "between-tricks",
      currentPlayerId: leader,
      currentTrick: null,
    });

    state = stateFrom(
      applyPlayerCommand(state, leader, { type: "begin-trick" }),
    );
    expect(state).toMatchObject({
      phase: "playing-trick",
      currentPlayerId: leader,
      currentTrick: {
        number: 1,
        leaderPlayerId: leader,
        plays: [],
        winnerPlayerId: null,
      },
    });
    expectCardConservation(state);

    const leadCardId = getPlayableCardIds(state, leader)[0];
    if (!leadCardId) {
      throw new Error("Expected the leader to have a playable card.");
    }
    state = stateFrom(
      applyPlayerCommand(state, leader, {
        type: "play-card",
        cardId: leadCardId,
      }),
    );
    expect(state.currentTrick?.plays).toEqual([
      { playerId: leader, cardId: leadCardId },
    ]);
    expectCardConservation(state);
  });

  it("conserves every card across assignment, communication, and trick transitions", () => {
    let state = start("planet-nine", "planet-nine:1");
    expectCardConservation(state);

    state = assignAllTasks(state);
    expectCardConservation(state);

    const communication = state.seatOrder
      .flatMap((playerId) =>
        state.players[playerId].hand.map((cardId) => ({
          playerId,
          cardId,
          qualifier: getCommunicationQualifiers(state, playerId, cardId)[0],
        })),
      )
      .find(
        (
          option,
        ): option is {
          playerId: string;
          cardId: CardId;
          qualifier: "highest" | "only" | "lowest";
        } => option.qualifier !== undefined,
      );
    if (!communication) {
      throw new Error("Expected at least one legal communication.");
    }

    state = stateFrom(
      applyPlayerCommand(state, communication.playerId, {
        type: "communicate",
        cardId: communication.cardId,
        qualifier: communication.qualifier,
      }),
    );
    expectCardConservation(state);

    for (let play = 0; play < state.seatOrder.length + 1; play += 1) {
      const actor = state.currentPlayerId;
      if (!actor) {
        throw new Error("Expected an actor while playing test tricks.");
      }
      const cardId = getPlayableCardIds(state, actor)[0];
      if (!cardId) {
        throw new Error("Expected at least one playable card.");
      }
      state = stateFrom(
        applyPlayerCommand(state, actor, {
          type: "play-card",
          cardId,
        }),
      );
      expectCardConservation(state);
    }
  });

  it("enforces turn order and following suit", () => {
    const deck = deckWithPlacements({
      0: "trump-4",
      1: "blue-9",
      3: "blue-1",
      4: "green-9",
    });
    let state = assignAllTasks(
      start("planet-nine", "planet-nine:1", 3, deck),
    );
    expect(state.currentPlayerId).toBe("p1");

    state = stateFrom(
      applyPlayerCommand(state, "p1", {
        type: "play-card",
        cardId: "blue-1",
      }),
    );
    expect(
      applyPlayerCommand(state, "p1", {
        type: "play-card",
        cardId: "trump-4",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOT_YOUR_TURN" } });
    expect(
      applyPlayerCommand(state, "p2", {
        type: "play-card",
        cardId: "green-9",
      }),
    ).toMatchObject({ ok: false, error: { code: "MUST_FOLLOW_SUIT" } });
  });

  it("requires following a trump lead but lets a trump-void player discard", () => {
    const deck = deckWithPlacements({
      0: "trump-4",
      1: "trump-2",
      2: "green-9",
      3: "trump-1",
      4: "trump-3",
      7: "blue-9",
    });
    let state = assignAllTasks(
      start("planet-nine", "planet-nine:1", 3, deck),
    );

    state = stateFrom(
      applyPlayerCommand(state, "p1", {
        type: "play-card",
        cardId: "trump-4",
      }),
    );
    expect(
      applyPlayerCommand(state, "p2", {
        type: "play-card",
        cardId: "blue-9",
      }),
    ).toMatchObject({ ok: false, error: { code: "MUST_FOLLOW_SUIT" } });

    state = stateFrom(
      applyPlayerCommand(state, "p2", {
        type: "play-card",
        cardId: "trump-2",
      }),
    );
    state = stateFrom(
      applyPlayerCommand(state, "p3", {
        type: "play-card",
        cardId: "green-9",
      }),
    );
    expect(state.lastTrick?.winnerPlayerId).toBe("p1");
  });

  it("awards a trick to the highest trump, otherwise the led suit", () => {
    expect(
      determineTrickWinner({
        number: 1,
        leaderPlayerId: "p1",
        plays: [
          { playerId: "p1", cardId: "blue-9" },
          { playerId: "p2", cardId: "trump-1" },
          { playerId: "p3", cardId: "green-9" },
        ],
        winnerPlayerId: null,
      }),
    ).toBe("p2");
    expect(
      determineTrickWinner({
        number: 1,
        leaderPlayerId: "p1",
        plays: [
          { playerId: "p1", cardId: "yellow-3" },
          { playerId: "p2", cardId: "yellow-8" },
          { playerId: "p3", cardId: "blue-9" },
        ],
        winnerPlayerId: null,
      }),
    ).toBe("p2");
  });

  it("keeps the highest led suit ahead of off-suit cards until a trump is played", () => {
    expect(
      determineTrickWinner({
        number: 1,
        leaderPlayerId: "p1",
        plays: [
          { playerId: "p1", cardId: "blue-8" },
          { playerId: "p2", cardId: "green-9" },
          { playerId: "p3", cardId: "blue-9" },
        ],
        winnerPlayerId: null,
      }),
    ).toBe("p3");
    expect(
      determineTrickWinner({
        number: 1,
        leaderPlayerId: "p1",
        plays: [
          { playerId: "p1", cardId: "blue-9" },
          { playerId: "p2", cardId: "green-9" },
          { playerId: "p3", cardId: "trump-1" },
        ],
        winnerPlayerId: null,
      }),
    ).toBe("p3");
  });

  it("makes the previous trick winner lead the next trick", () => {
    const deck = deckWithPlacements({
      0: "trump-4",
      1: "blue-9",
      2: "blue-2",
      3: "blue-1",
    });
    let state = assignAllTasks(
      start("planet-nine", "planet-nine:1", 3, deck),
    );

    for (const [playerId, cardId] of [
      ["p1", "blue-1"],
      ["p2", "blue-9"],
      ["p3", "blue-2"],
    ] as const) {
      state = stateFrom(
        applyPlayerCommand(state, playerId, {
          type: "play-card",
          cardId,
        }),
      );
    }

    expect(state).toMatchObject({
      phase: "between-tricks",
      currentPlayerId: "p2",
      lastTrick: { winnerPlayerId: "p2" },
    });

    const nextLead = getPlayableCardIds(state, "p2")[0];
    if (!nextLead) {
      throw new Error("Expected the winner to have another card.");
    }
    state = stateFrom(
      applyPlayerCommand(state, "p2", {
        type: "play-card",
        cardId: nextLead,
      }),
    );
    expect(state.currentTrick?.leaderPlayerId).toBe("p2");
    expect(state.currentTrick?.plays[0]).toEqual({
      playerId: "p2",
      cardId: nextLead,
    });
  });

  it("moves to adjudication when no complete trick remains", () => {
    const active = assignAllTasks(start("planet-nine", "planet-nine:1"));
    const actor = active.currentPlayerId as string;
    const next = active.seatOrder[1];
    const last = active.seatOrder[2];
    active.players[actor].hand = ["blue-1"];
    active.players[next].hand = ["green-1"];
    active.players[last].hand = ["yellow-1"];

    let state = stateFrom(
      applyPlayerCommand(active, actor, {
        type: "play-card",
        cardId: "blue-1",
      }),
    );
    state = stateFrom(
      applyPlayerCommand(state, next, {
        type: "play-card",
        cardId: "green-1",
      }),
    );
    state = stateFrom(
      applyPlayerCommand(state, last, {
        type: "play-card",
        cardId: "yellow-1",
      }),
    );
    expect(state.phase).toBe("adjudicating");
    expect(state.result).toBeNull();
  });
});

describe("manual mission adjudication and communication", () => {
  it("accepts truthful only and lowest communication qualifiers", () => {
    const deck = deckWithPlacements({
      0: "trump-4",
      1: "blue-1",
      2: "blue-3",
      3: "blue-2",
      5: "blue-5",
      6: "blue-4",
      8: "blue-7",
      9: "blue-6",
      11: "blue-9",
      12: "blue-8",
    });

    const onlyState = assignAllTasks(
      start("planet-nine", "planet-nine:1", 3, deck),
    );
    const communicatedOnly = stateFrom(
      applyPlayerCommand(onlyState, "p2", {
        type: "communicate",
        cardId: "blue-1",
        qualifier: "only",
      }),
    );
    expect(communicatedOnly.players.p2.communication).toEqual({
      cardId: "blue-1",
      qualifier: "only",
    });

    const lowestState = assignAllTasks(
      start("planet-nine", "planet-nine:1", 3, deck),
    );
    const communicatedLowest = stateFrom(
      applyPlayerCommand(lowestState, "p1", {
        type: "communicate",
        cardId: "blue-2",
        qualifier: "lowest",
      }),
    );
    expect(communicatedLowest.players.p1.communication).toEqual({
      cardId: "blue-2",
      qualifier: "lowest",
    });
  });

  it("rejects trump communication before the player has communicated", () => {
    const active = assignAllTasks(start("planet-nine", "planet-nine:1"));
    const captain = active.captainPlayerId as string;

    expect(
      applyPlayerCommand(active, captain, {
        type: "communicate",
        cardId: "trump-4",
        qualifier: "only",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_COMMUNICATION" },
    });
    expect(active.players[captain].hasCommunicated).toBe(false);
  });

  it("rejects communication during a dead-spot mission", () => {
    const active = assignAllTasks(start("planet-nine", "planet-nine:6"));
    const communication = active.seatOrder
      .flatMap((playerId) =>
        active.players[playerId].hand.map((cardId) => ({
          playerId,
          cardId,
          qualifier: getCommunicationQualifiers(
            active,
            playerId,
            cardId,
          )[0],
        })),
      )
      .find(
        (
          option,
        ): option is {
          playerId: string;
          cardId: CardId;
          qualifier: "highest" | "only" | "lowest";
        } => option.qualifier !== undefined,
      );
    if (!communication) {
      throw new Error("Expected a truthful communication fixture.");
    }

    expect(
      applyPlayerCommand(active, communication.playerId, {
        type: "communicate",
        cardId: communication.cardId,
        qualifier: communication.qualifier,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "COMMUNICATION_NOT_ALLOWED" },
    });
  });

  it("accepts only truthful, non-trump communication once per attempt", () => {
    const active = assignAllTasks(start("planet-nine", "planet-nine:1"));
    const actor = active.seatOrder[0];
    const hand = active.players[actor].hand;
    const bySuit = hand.filter((cardId) => cardId.startsWith("blue-"));
    const highest = [...bySuit].sort(
      (left, right) => Number(right.split("-")[1]) - Number(left.split("-")[1]),
    )[0];

    expect(
      applyPlayerCommand(active, actor, {
        type: "communicate",
        cardId: highest,
        qualifier: "only",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_COMMUNICATION" },
    });
    const communicated = stateFrom(
      applyPlayerCommand(active, actor, {
        type: "communicate",
        cardId: highest,
        qualifier: "highest",
      }),
    );
    expect(communicated.players[actor].communication).toEqual({
      cardId: highest,
      qualifier: "highest",
    });
    expect(
      applyPlayerCommand(communicated, actor, {
        type: "communicate",
        cardId: "trump-1",
        qualifier: "only",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "COMMUNICATION_NOT_ALLOWED" },
    });
  });

  it("waits for the commander to record success or failure after every task status is set", () => {
    const active = assignAllTasks(start("planet-nine", "planet-nine:1"));
    const actor = active.seatOrder.find(
      (playerId) => playerId !== active.captainPlayerId,
    ) as string;
    const commander = active.captainPlayerId as string;
    const taskId = active.tasks[0].id;
    const successfulTasks = stateFrom(
      applyPlayerCommand(active, actor, {
        type: "set-task-outcome",
        taskId,
        outcome: "success",
      }),
    );
    expect(successfulTasks).toMatchObject({
      phase: "between-tricks",
      result: null,
      tasks: [{ outcome: "success" }],
    });
    expect(
      applyPlayerCommand(successfulTasks, actor, {
        type: "set-mission-outcome",
        outcome: "success",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "OUTCOME_NOT_ALLOWED" },
    });
    const won = stateFrom(
      applyPlayerCommand(successfulTasks, commander, {
        type: "set-mission-outcome",
        outcome: "success",
      }),
    );
    expect(won).toMatchObject({ phase: "finished", result: "won" });

    const failedTasks = stateFrom(
      applyPlayerCommand(active, actor, {
        type: "set-task-outcome",
        taskId,
        outcome: "failure",
      }),
    );
    expect(failedTasks).toMatchObject({
      phase: "between-tricks",
      result: null,
      tasks: [{ outcome: "failure" }],
    });
    const lost = stateFrom(
      applyPlayerCommand(failedTasks, commander, {
        type: "set-mission-outcome",
        outcome: "failure",
      }),
    );
    expect(lost).toMatchObject({ phase: "finished", result: "lost" });
  });

  it("lets only the commander record a taskless manual mission outcome", () => {
    const taskless = start("deep-sea", "deep-sea:8");
    const commander = taskless.captainPlayerId as string;
    const crewMember = taskless.seatOrder.find(
      (playerId) => playerId !== commander,
    ) as string;
    expect(
      applyPlayerCommand(taskless, crewMember, {
        type: "set-mission-outcome",
        outcome: "success",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "OUTCOME_NOT_ALLOWED" },
    });
    const won = stateFrom(
      applyPlayerCommand(taskless, commander, {
        type: "set-mission-outcome",
        outcome: "success",
      }),
    );
    expect(won).toMatchObject({ phase: "finished", result: "won" });

    const tasked = assignAllTasks(start("deep-sea", "deep-sea:1"));
    expect(
      applyPlayerCommand(tasked, tasked.captainPlayerId as string, {
        type: "set-mission-outcome",
        outcome: "failure",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "OUTCOME_NOT_ALLOWED" },
    });
  });

  it("does not mutate the input snapshot", () => {
    const active = assignAllTasks(start("planet-nine", "planet-nine:1"));
    const original = structuredClone(active);
    applyPlayerCommand(active, active.seatOrder[0], {
      type: "set-task-outcome",
      taskId: active.tasks[0].id,
      outcome: "success",
    });
    expect(active).toEqual(original);
  });
});
