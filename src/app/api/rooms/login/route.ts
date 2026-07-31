import { NextResponse } from "next/server";

import { PlayerLoginSchema } from "@/server/contracts";
import { errorResponse } from "@/server/errors";
import { readJson } from "@/server/request";
import { loginPlayer } from "@/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = PlayerLoginSchema.parse(await readJson(request));
    return NextResponse.json(
      await loginPlayer(input.roomKey, input.playerKey),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
