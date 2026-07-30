import { type NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/server/admin-auth";
import { CreateRoomSchema } from "@/server/contracts";
import { errorResponse } from "@/server/errors";
import { readJson } from "@/server/request";
import {
  adminEditionOptions,
  createAdminRoom,
  listAdminRooms,
} from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(request);
    return NextResponse.json({
      rooms: await listAdminRooms(),
      editions: adminEditionOptions(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    requireAdmin(request);
    const input = CreateRoomSchema.parse(await readJson(request));
    return NextResponse.json(
      { room: await createAdminRoom(input) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
