import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/admin-auth";
import {
  SaveAdminRoomSettingsSchema,
  UpdateRoomSchema,
} from "@/server/contracts";
import { errorResponse } from "@/server/errors";
import { readJson } from "@/server/request";
import {
  deleteAdminRoom,
  getAdminRoom,
  saveAdminRoomSettings,
  updateAdminRoom,
} from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    requireAdmin(request);
    const roomId = await parseRoomId(context);
    return NextResponse.json({ room: await getAdminRoom(roomId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    requireAdmin(request);
    const roomId = await parseRoomId(context);
    const input = UpdateRoomSchema.parse(await readJson(request));
    return NextResponse.json({ room: await updateAdminRoom(roomId, input) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    requireAdmin(request);
    const roomId = await parseRoomId(context);
    const input = SaveAdminRoomSettingsSchema.parse(await readJson(request));
    return NextResponse.json({
      room: await saveAdminRoomSettings(roomId, input),
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
    const roomId = await parseRoomId(context);
    await deleteAdminRoom(roomId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

async function parseRoomId(context: RouteContext): Promise<string> {
  return z.string().uuid().parse((await context.params).roomId);
}
