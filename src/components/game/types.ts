import type { ActorProjection, PlayerCommand } from "@/game";

export type {
  ActorProjection,
  Card,
  CommunicationQualifier,
  GamePhase,
  GameResult,
  PlayerCommand,
  ProjectedTask,
  TaskOutcome,
  Trick,
} from "@/game";

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
};

export function apiErrorMessage(body: ApiErrorBody, fallback: string) {
  return body.error?.message ?? body.message ?? fallback;
}

export function unwrapProjection(payload: unknown): ActorProjection {
  const body = payload as {
    projection?: ActorProjection;
    room?: ActorProjection["room"];
    game?: Omit<ActorProjection, "room">;
  };

  if (body.projection) return body.projection;
  if (body.game && body.room) return { room: body.room, ...body.game };
  return payload as ActorProjection;
}

export function isPlayerCommand(value: unknown): value is PlayerCommand {
  return Boolean(value && typeof value === "object" && "type" in value);
}
