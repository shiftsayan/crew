import { type NextRequest, NextResponse } from "next/server";

import { RoomNameSchema } from "@/server/contracts";
import { errorResponse } from "@/server/errors";
import { getPlayerRoom } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ name: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const roomName = RoomNameSchema.parse((await context.params).name);
    const projection = await getPlayerRoom(
      roomName,
      request.headers.get("x-crew-player-key"),
    );
    return NextResponse.json(projection);
  } catch (error) {
    return errorResponse(error);
  }
}
