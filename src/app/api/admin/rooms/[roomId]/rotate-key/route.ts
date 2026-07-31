import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { errorResponse } from "@/server/errors";
import { rotateAdminRoomKey } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    requireAdmin(request);
    const roomId = z.string().uuid().parse((await context.params).roomId);
    return NextResponse.json({
      room: await rotateAdminRoomKey(roomId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
