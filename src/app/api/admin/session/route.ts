import { type NextRequest, NextResponse } from "next/server";

import {
  clearAdminSessionCookie,
  hasValidAdminSession,
  passwordMatches,
  setAdminSessionCookie,
} from "@/server/admin-auth";
import { AdminLoginSchema } from "@/server/contracts";
import { AppError, errorResponse } from "@/server/errors";
import { readJson } from "@/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authenticated = hasValidAdminSession(request);
    return NextResponse.json({ authenticated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const input = AdminLoginSchema.parse(await readJson(request));
    if (!passwordMatches(input.password)) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "The admin password is incorrect.",
        401,
      );
    }

    const response = NextResponse.json({ authenticated: true });
    setAdminSessionCookie(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const response = NextResponse.json({ authenticated: false });
    clearAdminSessionCookie(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
