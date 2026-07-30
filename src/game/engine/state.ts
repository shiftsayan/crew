import {
  CURRENT_STATE_VERSION,
  type EditionKey,
  type GameState,
  type MissionKey,
} from "../contracts";
import { getMission } from "../config";

export type CreateSetupStateInput = {
  editionKey: EditionKey;
  missionKey: MissionKey;
  attemptNumber?: number;
};

export function createSetupState({
  editionKey,
  missionKey,
  attemptNumber = 1,
}: CreateSetupStateInput): GameState {
  getMission(editionKey, missionKey);
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error("Attempt number must be a positive integer.");
  }
  return {
    stateVersion: CURRENT_STATE_VERSION,
    editionKey,
    missionKey,
    attemptNumber,
    phase: "setup",
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
