import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { errorResponse } from "@/server/errors";
import { rotateAdminPlayerKey } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ roomId: string; playerId: string }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    requireAdmin(request);
    const params = await context.params;
    const roomId = z.string().uuid().parse(params.roomId);
    const playerId = z.string().uuid().parse(params.playerId);
    return NextResponse.json({
      room: await rotateAdminPlayerKey(roomId, playerId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
