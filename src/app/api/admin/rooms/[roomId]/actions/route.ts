import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import { AdminRoomActionSchema } from "@/server/contracts";
import { errorResponse } from "@/server/errors";
import { readJson } from "@/server/request";
import { runAdminRoomAction } from "@/server/rooms";

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
    const input = AdminRoomActionSchema.parse(await readJson(request));
    return NextResponse.json({
      room: await runAdminRoomAction(
        roomId,
        input.type,
        input.confirmReset,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
