import { describe, expect, it } from "vitest";

import {
  CARD_IDS,
  DEEP_SEA_TASKS,
  NON_TRUMP_CARD_IDS,
  applyPlayerCommand,
  createPreflightState,
  startAttempt,
  type GameState,
} from "@/game";
import type { PlayerRow, RoomRow } from "@/server/contracts";
import { stateIsCoherent, stateMatchesMissionConfig } from "@/server/rooms";

const players = ["player-1", "player-2", "player-3"];

function startedState(
  editionKey: "planet-nine" | "deep-sea",
  missionKey: `${"planet-nine" | "deep-sea"}:${number}`,
): GameState {
  const started = startAttempt(
    createPreflightState({ editionKey, missionKey, attemptNumber: 1 }),
    {
      playerIds: players,
      deckOrder: [...CARD_IDS],
      taskOrder:
        editionKey === "planet-nine"
          ? [...NON_TRUMP_CARD_IDS]
          : DEEP_SEA_TASKS.map((task) => task.id),
    },
  );
  if (!started.ok) {
    throw new Error(started.error.message);
  }
  return started.state;
}

function persistedAttempt(state: GameState): {
  room: RoomRow;
  roster: PlayerRow[];
} {
  const now = new Date("2026-08-02T12:00:00.000Z");
  const room: RoomRow = {
    id: "room-1",
    name: "Europa",
    editionKey: state.editionKey,
    missionKey: state.missionKey,
    stateVersion: state.stateVersion,
    state,
    createdAt: now,
    updatedAt: now,
  };
  const roster = state.seatOrder.map((id, index) => ({
    id,
    roomId: room.id,
    displayName: `Player${index + 1}`,
    tags: [],
    seat: index + 1,
    createdAt: now,
  }));
  return { room, roster };
}

describe("stored mission configuration compatibility", () => {
  it("accepts current Planet Nine and Deep Sea snapshots", () => {
    expect(
      stateMatchesMissionConfig(startedState("planet-nine", "planet-nine:3")),
    ).toBe(true);
    expect(
      stateMatchesMissionConfig(startedState("deep-sea", "deep-sea:5")),
    ).toBe(true);
  });

  it("accepts a fully assigned snapshot waiting for Start Trick", () => {
    const assigning = startedState("planet-nine", "planet-nine:1");
    const claimed = applyPlayerCommand(assigning, players[1], {
      type: "claim-task",
      taskId: assigning.tasks[0].id,
    });
    if (!claimed.ok) {
      throw new Error(claimed.error.message);
    }

    expect(claimed.state).toMatchObject({
      phase: "ready-to-start-trick",
      currentPlayerId: null,
      trickNumber: 0,
      currentTrick: null,
      lastTrick: null,
    });
    expect(stateMatchesMissionConfig(claimed.state)).toBe(true);
    const { room, roster } = persistedAttempt(claimed.state);
    expect(stateIsCoherent(claimed.state, room, roster)).toBe(true);

    const prematurelyReady = structuredClone(
      startedState("planet-nine", "planet-nine:3"),
    );
    prematurelyReady.phase = "ready-to-start-trick";
    prematurelyReady.currentPlayerId = null;
    expect(stateMatchesMissionConfig(prematurelyReady)).toBe(false);

    const alreadyCommunicated = structuredClone(claimed.state);
    alreadyCommunicated.players[players[0]].hasCommunicated = true;
    expect(stateIsCoherent(alreadyCommunicated, room, roster)).toBe(false);

    const alreadyResolved = structuredClone(claimed.state);
    alreadyResolved.tasks[0].outcome = "success";
    expect(stateIsCoherent(alreadyResolved, room, roster)).toBe(false);

    const released = applyPlayerCommand(claimed.state, players[1], {
      type: "release-task",
      taskId: claimed.state.tasks[0].id,
    });
    if (!released.ok) throw new Error(released.error.message);
    expect(released.state).toMatchObject({
      phase: "assigning-tasks",
      assignmentTurns: 0,
      tasks: [{ ownerPlayerId: null }],
    });
    expect(stateIsCoherent(released.state, room, roster)).toBe(true);
  });

  it("accepts only a coherent cardless trick started by the next leader", () => {
    const assigning = startedState("planet-nine", "planet-nine:1");
    const claimed = applyPlayerCommand(assigning, players[1], {
      type: "claim-task",
      taskId: assigning.tasks[0].id,
    });
    if (!claimed.ok) throw new Error(claimed.error.message);
    const between = applyPlayerCommand(claimed.state, players[1], {
      type: "start-trick",
    });
    if (!between.ok) throw new Error(between.error.message);
    const leader = between.state.currentPlayerId as string;
    const begun = applyPlayerCommand(between.state, leader, {
      type: "begin-trick",
    });
    if (!begun.ok) throw new Error(begun.error.message);

    expect(begun.state).toMatchObject({
      phase: "playing-trick",
      currentPlayerId: leader,
      currentTrick: {
        number: 1,
        leaderPlayerId: leader,
        plays: [],
        winnerPlayerId: null,
      },
    });
    const { room, roster } = persistedAttempt(begun.state);
    expect(stateIsCoherent(begun.state, room, roster)).toBe(true);

    const wrongCurrent = structuredClone(begun.state);
    wrongCurrent.currentPlayerId = wrongCurrent.seatOrder.find(
      (playerId) => playerId !== leader,
    ) as string;
    expect(stateIsCoherent(wrongCurrent, room, roster)).toBe(false);

    const wrongLeader = structuredClone(begun.state);
    wrongLeader.currentTrick!.leaderPlayerId = wrongLeader.seatOrder.find(
      (playerId) => playerId !== leader,
    ) as string;
    wrongLeader.currentPlayerId = wrongLeader.currentTrick!.leaderPlayerId;
    expect(stateIsCoherent(wrongLeader, room, roster)).toBe(false);
  });

  it("accepts a task released while assignment remains open", () => {
    const assigning = startedState("planet-nine", "planet-nine:3");
    const claimed = applyPlayerCommand(assigning, players[1], {
      type: "claim-task",
      taskId: assigning.tasks[0].id,
    });
    if (!claimed.ok) throw new Error(claimed.error.message);
    const released = applyPlayerCommand(claimed.state, players[1], {
      type: "release-task",
      taskId: assigning.tasks[0].id,
    });
    if (!released.ok) throw new Error(released.error.message);

    expect(released.state).toMatchObject({
      phase: "assigning-tasks",
      assignmentTurns: 0,
      tasks: [{ ownerPlayerId: null }, { ownerPlayerId: null }],
    });
    const { room, roster } = persistedAttempt(released.state);
    expect(stateIsCoherent(released.state, room, roster)).toBe(true);

    const staleCount = structuredClone(released.state);
    staleCount.assignmentTurns = 1;
    expect(stateIsCoherent(staleCount, room, roster)).toBe(false);
  });

  it("rejects stale Planet Nine task references and order tokens", () => {
    const staleDefinition = structuredClone(
      startedState("planet-nine", "planet-nine:3"),
    );
    staleDefinition.tasks[0].definitionId = "planet-nine-card:blue-9";
    expect(stateMatchesMissionConfig(staleDefinition)).toBe(false);

    const staleOrder = structuredClone(
      startedState("planet-nine", "planet-nine:3"),
    );
    staleOrder.tasks[0].order = "last";
    expect(stateMatchesMissionConfig(staleOrder)).toBe(false);
  });

  it("rejects stale Deep Sea task references and difficulty budgets", () => {
    const staleReference = structuredClone(
      startedState("deep-sea", "deep-sea:5"),
    );
    staleReference.tasks[0].definitionId = "deep-sea-task-999";
    expect(stateMatchesMissionConfig(staleReference)).toBe(false);

    const staleDifficulty = structuredClone(
      startedState("deep-sea", "deep-sea:5"),
    );
    staleDifficulty.tasks[0].difficulty =
      (staleDifficulty.tasks[0].difficulty ?? 0) + 1;
    expect(stateMatchesMissionConfig(staleDifficulty)).toBe(false);
  });
});
