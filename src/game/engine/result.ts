import type {
  EngineErrorCode,
  GameState,
  TransitionResult,
} from "../contracts";

export function success(state: GameState): TransitionResult {
  return { ok: true, state };
}

export function failure(
  code: EngineErrorCode,
  message: string,
): TransitionResult {
  return { ok: false, error: { code, message } };
}
