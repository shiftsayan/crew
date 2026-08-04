import "server-only";

import { randomInt } from "node:crypto";

import {
  CARD_DECK,
  CURRENT_STATE_VERSION,
  DEEP_SEA_TASKS,
  EDITIONS,
  GameStateSchema,
  MISSIONS,
  NON_TRUMP_CARDS,
  applyPlayerCommand,
  createPreflightState,
  getMission,
  getNextMission,
  projectForPlayer,
  startAttempt,
  type ActorProjection,
  type EditionKey,
  type EnginePlayerCommand,
  type GameState,
  type MissionKey,
  type ProjectionContext,
} from "@/game";

import { AppError } from "@/server/errors";
import type { AdminEditionOption } from "@/server/contracts";

export { CURRENT_STATE_VERSION, GameStateSchema };
export type {
  ActorProjection,
  EnginePlayerCommand,
  GameState,
  ProjectionContext,
};

export function adminEditionOptions(): AdminEditionOption[] {
  return EDITIONS.map((edition) => ({
    key: edition.key,
    title: edition.title,
    missions: MISSIONS.filter(
      (mission) => mission.editionKey === edition.key,
    ).map((mission) => ({
      key: mission.key,
      number: mission.number,
      title: mission.title,
    })),
  }));
}

export function assertMission(
  editionKey: string,
  missionKey: string,
): { editionKey: EditionKey; missionKey: MissionKey } {
  try {
    const mission = getMission(
      editionKey as EditionKey,
      missionKey as MissionKey,
    );

    return {
      editionKey: mission.editionKey,
      missionKey: mission.key,
    };
  } catch {
    throw new AppError(
      "INVALID_REQUEST",
      "That mission is not configured for this edition.",
      400,
    );
  }
}

export function makePreflightState(
  editionKey: string,
  missionKey: string,
  attemptNumber = 1,
): GameState {
  const mission = assertMission(editionKey, missionKey);
  return createPreflightState({
    ...mission,
    attemptNumber,
  });
}

export function nextMissionFor(
  editionKey: string,
  missionKey: string,
): { editionKey: EditionKey; missionKey: MissionKey } | null {
  const mission = assertMission(editionKey, missionKey);
  const nextMission = getNextMission(mission.editionKey, mission.missionKey);
  if (!nextMission) {
    return null;
  }

  return {
    editionKey: nextMission.editionKey,
    missionKey: nextMission.key,
  };
}

export function beginAttempt(
  preflightState: GameState,
  playerIdsInSeatOrder: string[],
): GameState {
  const deckOrder = shuffled(CARD_DECK.map((card) => card.id));
  const taskCandidates =
    preflightState.editionKey === "deep-sea"
      ? DEEP_SEA_TASKS.map((task) => task.id)
      : NON_TRUMP_CARDS.map((card) => card.id);
  const taskOrder = shuffled(taskCandidates);

  const result = startAttempt(preflightState, {
    playerIds: playerIdsInSeatOrder,
    deckOrder,
    taskOrder,
  });

  if (!result.ok) {
    throw new AppError(result.error.code, result.error.message, 409);
  }

  return result.state;
}

export function runPlayerCommand(
  state: GameState,
  actorPlayerId: string,
  command: EnginePlayerCommand,
): GameState {
  const result = applyPlayerCommand(state, actorPlayerId, command);
  if (!result.ok) {
    throw new AppError(result.error.code, result.error.message, 409);
  }

  return result.state;
}

export function makePlayerProjection(
  state: GameState,
  actorPlayerId: string,
  context: ProjectionContext,
): ActorProjection {
  return projectForPlayer(state, actorPlayerId, context);
}

function shuffled<Value>(values: readonly Value[]): Value[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
