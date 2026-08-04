import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import {
  ConfirmResetSchema,
  UpdatePlayerSchema,
} from "@/server/contracts";
import { errorResponse } from "@/server/errors";
import { readJson } from "@/server/request";
import {
  deleteAdminPlayer,
  updateAdminPlayer,
} from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ roomId: string; playerId: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    requireAdmin(request);
    const { roomId, playerId } = await parseIds(context);
    const input = UpdatePlayerSchema.parse(await readJson(request));
    return NextResponse.json({
      room: await updateAdminPlayer(roomId, playerId, input),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    requireAdmin(request);
    const { roomId, playerId } = await parseIds(context);
    const rawInput = request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
      ? await readJson(request)
      : {};
    const input = ConfirmResetSchema.parse(rawInput);
    return NextResponse.json({
      room: await deleteAdminPlayer(
        roomId,
        playerId,
        input.confirmReset,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function parseIds(context: RouteContext): Promise<{
  roomId: string;
  playerId: string;
}> {
  const params = await context.params;
  return {
    roomId: z.string().uuid().parse(params.roomId),
    playerId: z.string().uuid().parse(params.playerId),
  };
}
