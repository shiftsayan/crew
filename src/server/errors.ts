import { NextResponse } from "next/server";
import { z } from "zod";

export type ErrorCode =
  | "ADMIN_AUTH_REQUIRED"
  | "CONFLICT"
  | "INVALID_CREDENTIALS"
  | "INVALID_REQUEST"
  | "LEVEL_RESTART_REQUIRED"
  | "MISSION_UNSET"
  | "NOT_FOUND"
  | "ROOM_NOT_READY"
  | "SERVER_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

type PostgreSqlError = Error & {
  code?: string;
  constraint?: string;
};

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        message: error.message,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        message: "The request did not match the expected shape.",
        error: {
          code: "INVALID_REQUEST",
          message: "The request did not match the expected shape.",
          details: z.treeifyError(error),
        },
      },
      { status: 400 },
    );
  }

  const databaseError = error as PostgreSqlError;
  if (databaseError.code === "23505") {
    return NextResponse.json(
      {
        message: conflictMessage(databaseError.constraint),
        error: {
          code: "CONFLICT",
          message: conflictMessage(databaseError.constraint),
        },
      },
      { status: 409 },
    );
  }

  if (databaseError.code === "23514" || databaseError.code === "23503") {
    return NextResponse.json(
      {
        message: "The requested change violates a room constraint.",
        error: {
          code: "INVALID_REQUEST",
          message: "The requested change violates a room constraint.",
        },
      },
      { status: 400 },
    );
  }

  console.error("Unhandled API error", error);
  return NextResponse.json(
    {
      message: "Something went wrong.",
      error: {
        code: "SERVER_ERROR",
        message: "Something went wrong.",
      },
    },
    { status: 500 },
  );
}

function conflictMessage(constraint?: string): string {
  if (constraint === "rooms_name_case_insensitive_key") {
    return "A room with that name already exists.";
  }

  if (constraint === "room_players_display_name_case_insensitive_key") {
    return "That player name is already used in this room.";
  }

  if (constraint === "room_players_room_seat_key") {
    return "That seat is already occupied.";
  }

  return "That value is already in use.";
}
