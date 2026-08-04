import {
  CURRENT_STATE_VERSION,
  type EditionKey,
  type GameState,
  type MissionKey,
} from "../contracts";
import { getMission } from "../config";

export type CreatePreflightStateInput = {
  editionKey: EditionKey;
  missionKey: MissionKey;
  attemptNumber?: number;
};

export function createPreflightState({
  editionKey,
  missionKey,
  attemptNumber = 1,
}: CreatePreflightStateInput): GameState {
  getMission(editionKey, missionKey);
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error("Attempt number must be a positive integer.");
  }
  return {
    stateVersion: CURRENT_STATE_VERSION,
    editionKey,
    missionKey,
    attemptNumber,
    phase: "preflight",
    result: null,
    seatOrder: [],
    captainPlayerId: null,
    currentPlayerId: null,
    players: {},
    tasks: [],
    assignmentTurns: 0,
    currentTrick: null,
    lastTrick: null,
    trickNumber: 0,
  };
}
