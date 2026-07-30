import { describe, expect, it } from "vitest";
import {
  CARD_IDS,
  NON_TRUMP_CARD_IDS,
  applyPlayerCommand,
  createSetupState,
  projectForPlayer,
  startAttempt,
  type GameState,
  type ProjectionContext,
  type TransitionResult,
} from "..";

const context: ProjectionContext = {
  roomId: "room-1",
  roomName: "Apollo",
  roster: [
    { id: "p1", displayName: "Ada", seat: 1 },
    { id: "p2", displayName: "Grace", seat: 2 },
    { id: "p3", displayName: "Katherine", seat: 3 },
  ],
};

function stateFrom(result: TransitionResult): GameState {
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.state;
}

describe("player projection", () => {
  it("projects setup rooms before engine players exist", () => {
    const setup = createSetupState({
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    });
    const projection = projectForPlayer(setup, "p1", context);
    expect(projection.phase).toBe("setup");
    expect(projection.self).toMatchObject({
      id: "p1",
      displayName: "Ada",
      hand: [],
    });
    expect(projection.players).toHaveLength(3);
  });

  it("reveals only the actor's hand and server-derived legal actions", () => {
    const setup = createSetupState({
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    });
    const started = stateFrom(
      startAttempt(setup, {
        playerIds: ["p1", "p2", "p3"],
        deckOrder: [...CARD_IDS],
        taskOrder: [...NON_TRUMP_CARD_IDS],
      }),
    );
    const captain = started.currentPlayerId as string;
    const projection = projectForPlayer(started, captain, context);

    expect(projection.self.hand.length).toBeGreaterThan(0);
    expect(projection.players.every((player) => player.cardCount > 0)).toBe(
      true,
    );
    expect(projection.legalActions.claimableTaskIds).toEqual([
      started.tasks[0].id,
    ]);
    expect(projection.tasks[0]).toMatchObject({
      title: expect.any(String),
      footnote: null,
    });
    expect(Object.hasOwn(projection.players[0], "hand")).toBe(false);
  });

  it("projects Deep Sea presentation metadata from code instead of stored state", () => {
    const setup = createSetupState({
      editionKey: "deep-sea",
      missionKey: "deep-sea:4",
    });
    const started = stateFrom(
      startAttempt(setup, {
        playerIds: ["p1", "p2", "p3"],
        deckOrder: [...CARD_IDS],
        taskOrder: [
          "deep-sea-task-21",
          ...Array.from(
            { length: 96 },
            (_, index) => `deep-sea-task-${index + 1}`,
          ).filter((taskId) => taskId !== "deep-sea-task-21"),
        ],
      }),
    );
    const projection = projectForPlayer(
      started,
      started.currentPlayerId as string,
      context,
    );

    expect(Object.hasOwn(started.tasks[0], "title")).toBe(false);
    expect(projection.tasks[0]).toMatchObject({
      title: "I will win as many Pink as Yellow cards",
      footnote: "Zero Pink and Yellow cards is not allowed.",
    });
  });

  it("derives playable card IDs after assignment", () => {
    const setup = createSetupState({
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    });
    let state = stateFrom(
      startAttempt(setup, {
        playerIds: ["p1", "p2", "p3"],
        deckOrder: [...CARD_IDS],
        taskOrder: [...NON_TRUMP_CARD_IDS],
      }),
    );
    state = stateFrom(
      applyPlayerCommand(state, state.currentPlayerId as string, {
        type: "claim-task",
        taskId: state.tasks[0].id,
      }),
    );
    const actor = state.currentPlayerId as string;
    const projection = projectForPlayer(state, actor, context);
    expect(projection.legalActions.playableCardIds).toEqual(
      state.players[actor].hand,
    );
  });
});
