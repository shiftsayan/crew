import { describe, expect, it } from "vitest";
import {
  CARD_IDS,
  DEEP_SEA_MISSIONS,
  DEEP_SEA_TASKS,
  NON_TRUMP_CARD_IDS,
  applyPlayerCommand,
  createSetupState,
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
  const setup = createSetupState({ editionKey, missionKey });
  return stateFrom(
    startAttempt(setup, {
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
    if (!task || !state.currentPlayerId) {
      throw new Error("Invalid task assignment fixture.");
    }
    state = stateFrom(
      applyPlayerCommand(state, state.currentPlayerId, {
        type: "claim-task",
        taskId: task.id,
      }),
    );
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

describe("attempt setup", () => {
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
    const setup = createSetupState({
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    });
    const result = startAttempt(setup, {
      playerIds: PLAYER_IDS.slice(0, 3),
      deckOrder: [...CARD_IDS.slice(0, 39), CARD_IDS[0]],
      taskOrder: [...NON_TRUMP_CARD_IDS],
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_SETUP" },
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
  it("starts with the captain, rotates, and enters play when all tasks are claimed", () => {
    const state = start("planet-nine", "planet-nine:3");
    expect(state.currentPlayerId).toBe(state.captainPlayerId);
    expect(state.tasks.map((task) => task.order)).toEqual(["one", "two"]);

    const firstActor = state.currentPlayerId as string;
    const afterFirst = stateFrom(
      applyPlayerCommand(state, firstActor, {
        type: "claim-task",
        taskId: state.tasks[0].id,
      }),
    );
    expect(afterFirst.currentPlayerId).not.toBe(firstActor);

    const afterSecond = stateFrom(
      applyPlayerCommand(afterFirst, afterFirst.currentPlayerId as string, {
        type: "claim-task",
        taskId: afterFirst.tasks[1].id,
      }),
    );
    expect(afterSecond.phase).toBe("between-tricks");
    expect(afterSecond.currentPlayerId).toBe(afterSecond.captainPlayerId);
  });

  it("allows required Deep Sea passes but prevents leaving tasks unassigned", () => {
    let state = start("deep-sea", "deep-sea:1");
    expect(state.tasks).toHaveLength(1);

    state = stateFrom(
      applyPlayerCommand(state, state.currentPlayerId as string, {
        type: "pass-task",
      }),
    );
    state = stateFrom(
      applyPlayerCommand(state, state.currentPlayerId as string, {
        type: "pass-task",
      }),
    );
    const invalidPass = applyPlayerCommand(
      state,
      state.currentPlayerId as string,
      { type: "pass-task" },
    );
    expect(invalidPass).toMatchObject({
      ok: false,
      error: { code: "PASS_NOT_ALLOWED" },
    });

    const claimed = stateFrom(
      applyPlayerCommand(state, state.currentPlayerId as string, {
        type: "claim-task",
        taskId: state.tasks[0].id,
      }),
    );
    expect(claimed.phase).toBe("between-tricks");
  });
});

describe("trick-taking rules", () => {
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

  it("finishes immediately on a manual task success or failure", () => {
    const active = assignAllTasks(start("planet-nine", "planet-nine:1"));
    const actor = active.seatOrder[1];
    const taskId = active.tasks[0].id;
    const won = stateFrom(
      applyPlayerCommand(active, actor, {
        type: "set-task-outcome",
        taskId,
        outcome: "success",
      }),
    );
    expect(won).toMatchObject({ phase: "finished", result: "won" });

    const lost = stateFrom(
      applyPlayerCommand(active, actor, {
        type: "set-task-outcome",
        taskId,
        outcome: "failure",
      }),
    );
    expect(lost).toMatchObject({ phase: "finished", result: "lost" });
  });

  it("uses explicit mission outcomes only for taskless manual-rule missions", () => {
    const taskless = start("deep-sea", "deep-sea:8");
    const won = stateFrom(
      applyPlayerCommand(taskless, taskless.seatOrder[0], {
        type: "set-mission-outcome",
        outcome: "success",
      }),
    );
    expect(won).toMatchObject({ phase: "finished", result: "won" });

    const tasked = assignAllTasks(start("deep-sea", "deep-sea:1"));
    expect(
      applyPlayerCommand(tasked, tasked.seatOrder[0], {
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
