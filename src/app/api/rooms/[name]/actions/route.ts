import { type NextRequest, NextResponse } from "next/server";

import { PlayerCommandSchema } from "@/game";
import { RoomNameSchema } from "@/server/contracts";
import { errorResponse } from "@/server/errors";
import { readJson } from "@/server/request";
import { applyPlayerRoomCommand } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ name: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const roomName = RoomNameSchema.parse((await context.params).name);
    const command = PlayerCommandSchema.parse(await readJson(request));
    const projection = await applyPlayerRoomCommand(
      roomName,
      request.headers.get("x-crew-room-key"),
      request.headers.get("x-crew-player-key"),
      command,
    );
    return NextResponse.json(projection);
  } catch (error) {
    return errorResponse(error);
  }
}
