import { describe, expect, it } from "vitest";
import {
  CARD_IDS,
  NON_TRUMP_CARD_IDS,
  applyPlayerCommand,
  createPreflightState,
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
    {
      id: "p1",
      displayName: "Ada",
      tags: ["bug"],
      seat: 1,
    },
    { id: "p2", displayName: "Grace", tags: [], seat: 2 },
    {
      id: "p3",
      displayName: "Katherine",
      tags: ["always-red"],
      seat: 3,
    },
  ],
};

function stateFrom(result: TransitionResult): GameState {
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.state;
}

describe("player projection", () => {
  it("projects preflight rooms before engine players exist", () => {
    const preflight = createPreflightState({
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    });
    const projection = projectForPlayer(preflight, "p1", context);
    expect(projection.phase).toBe("preflight");
    expect(projection.self).toMatchObject({
      id: "p1",
      displayName: "Ada",
      tags: ["bug"],
      hand: [],
    });
    expect(projection.players).toHaveLength(3);
    expect(projection.players.map((player) => player.tags)).toEqual([
      ["bug"],
      [],
      ["always-red"],
    ]);
    expect(projection.legalActions.canStartMission).toBe(true);
  });

  it("reveals only the actor's hand and server-derived legal actions", () => {
    const preflight = createPreflightState({
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    });
    const started = stateFrom(
      startAttempt(preflight, {
        playerIds: ["p1", "p2", "p3"],
        deckOrder: [...CARD_IDS],
        taskOrder: [...NON_TRUMP_CARD_IDS],
      }),
    );
    const projections = started.seatOrder.map((playerId) =>
      projectForPlayer(started, playerId, context),
    );
    const projection = projections[0];

    expect(projection.self.hand.length).toBeGreaterThan(0);
    expect(projection.players.every((player) => player.cardCount > 0)).toBe(
      true,
    );
    for (const playerProjection of projections) {
      expect(playerProjection.legalActions.claimableTaskIds).toEqual([
        started.tasks[0].id,
      ]);
      expect(playerProjection.legalActions.releasableTaskIds).toEqual([]);
      expect(playerProjection.legalActions.canPassTask).toBe(false);
      expect(
        playerProjection.players.every((player) => !player.isCurrent),
      ).toBe(true);
    }
    expect(projection.tasks[0]).toMatchObject({
      title: expect.any(String),
      footnote: null,
    });
    expect(Object.hasOwn(projection.players[0], "hand")).toBe(false);
  });

  it("projects task deselection only to the owner while assignment remains open", () => {
    const preflight = createPreflightState({
      editionKey: "planet-nine",
      missionKey: "planet-nine:3",
    });
    let state = stateFrom(
      startAttempt(preflight, {
        playerIds: ["p1", "p2", "p3"],
        deckOrder: [...CARD_IDS],
        taskOrder: [...NON_TRUMP_CARD_IDS],
      }),
    );
    const selectedTaskId = state.tasks[0].id;
    const remainingTaskId = state.tasks[1].id;
    state = stateFrom(
      applyPlayerCommand(state, "p1", {
        type: "claim-task",
        taskId: selectedTaskId,
      }),
    );

    expect(projectForPlayer(state, "p1", context).legalActions).toMatchObject({
      claimableTaskIds: [remainingTaskId],
      releasableTaskIds: [selectedTaskId],
    });
    expect(projectForPlayer(state, "p2", context).legalActions).toMatchObject({
      claimableTaskIds: [remainingTaskId],
      releasableTaskIds: [],
    });

    state = stateFrom(
      applyPlayerCommand(state, "p1", {
        type: "release-task",
        taskId: selectedTaskId,
      }),
    );
    expect(projectForPlayer(state, "p1", context).legalActions).toMatchObject({
      claimableTaskIds: [selectedTaskId, remainingTaskId],
      releasableTaskIds: [],
    });
  });

  it("projects Deep Sea presentation metadata from code instead of stored state", () => {
    const preflight = createPreflightState({
      editionKey: "deep-sea",
      missionKey: "deep-sea:4",
    });
    const started = stateFrom(
      startAttempt(preflight, {
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

  it("waits for Start Trick before exposing gameplay actions", () => {
    const preflight = createPreflightState({
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    });
    let state = stateFrom(
      startAttempt(preflight, {
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
    const actor = state.seatOrder.find(
      (playerId) => playerId !== state.captainPlayerId,
    ) as string;
    const readyProjection = projectForPlayer(state, actor, context);
    expect(readyProjection.phase).toBe("ready-to-start-trick");
    const selectedTask = state.tasks[0];
    for (const playerId of state.seatOrder) {
      const waitingProjection = projectForPlayer(state, playerId, context);
      expect(waitingProjection.legalActions).toMatchObject({
        canStartTrick: true,
        claimableTaskIds: [],
        canPassTask: false,
        playableCardIds: [],
        communicationOptions: [],
        taskOutcomeTaskIds: [],
        canSetMissionOutcome: false,
      });
      expect(waitingProjection.legalActions.releasableTaskIds).toEqual(
        playerId === selectedTask.ownerPlayerId ? [selectedTask.id] : [],
      );
      expect(
        waitingProjection.players.every((player) => !player.isCurrent),
      ).toBe(true);
    }

    state = stateFrom(
      applyPlayerCommand(state, actor, { type: "start-trick" }),
    );
    const captain = state.captainPlayerId as string;
    const projection = projectForPlayer(state, captain, context);
    expect(projection.legalActions.canStartTrick).toBe(true);
    expect(projection.legalActions.releasableTaskIds).toEqual([]);
    expect(projection.legalActions.playableCardIds).toEqual(
      state.players[captain].hand,
    );
    for (const playerId of state.seatOrder.filter(
      (playerId) => playerId !== captain,
    )) {
      expect(
        projectForPlayer(state, playerId, context).legalActions.canStartTrick,
      ).toBe(false);
    }

    state = stateFrom(
      applyPlayerCommand(state, captain, { type: "begin-trick" }),
    );
    const playingProjection = projectForPlayer(state, captain, context);
    expect(playingProjection.phase).toBe("playing-trick");
    expect(playingProjection.currentTrick?.plays).toEqual([]);
    expect(playingProjection.legalActions.canStartTrick).toBe(false);
    expect(playingProjection.legalActions.communicationOptions).toEqual([]);
    expect(playingProjection.legalActions.playableCardIds).toEqual(
      state.players[captain].hand,
    );
  });

  it("offers final mission CTAs only to the commander after all task statuses are set", () => {
    const preflight = createPreflightState({
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    });
    let state = stateFrom(
      startAttempt(preflight, {
        playerIds: ["p1", "p2", "p3"],
        deckOrder: [...CARD_IDS],
        taskOrder: [...NON_TRUMP_CARD_IDS],
      }),
    );
    state = stateFrom(
      applyPlayerCommand(state, "p1", {
        type: "claim-task",
        taskId: state.tasks[0].id,
      }),
    );
    state = stateFrom(
      applyPlayerCommand(state, "p2", { type: "start-trick" }),
    );

    const commander = state.captainPlayerId as string;
    const crewMember = state.seatOrder.find(
      (playerId) => playerId !== commander,
    ) as string;
    expect(
      projectForPlayer(state, commander, context).legalActions
        .canSetMissionOutcome,
    ).toBe(false);

    state = stateFrom(
      applyPlayerCommand(state, crewMember, {
        type: "set-task-outcome",
        taskId: state.tasks[0].id,
        outcome: "failure",
      }),
    );
    expect(
      projectForPlayer(state, commander, context).legalActions
        .canSetMissionOutcome,
    ).toBe(true);
    expect(
      projectForPlayer(state, crewMember, context).legalActions
        .canSetMissionOutcome,
    ).toBe(false);

    state = stateFrom(
      applyPlayerCommand(state, crewMember, {
        type: "set-task-outcome",
        taskId: state.tasks[0].id,
        outcome: "pending",
      }),
    );
    expect(
      projectForPlayer(state, commander, context).legalActions
        .canSetMissionOutcome,
    ).toBe(false);
  });
});
