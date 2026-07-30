import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { NextRequest, NextResponse } from "next/server";

import { getServerEnvironment } from "@/server/env";
import { AppError } from "@/server/errors";

const ADMIN_COOKIE_NAME = "crew_admin";
const ADMIN_SESSION_LIFETIME_SECONDS = 8 * 60 * 60;

interface AdminSessionPayload {
  expiresAt: number;
  version: 1;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function passwordMatches(candidate: string): boolean {
  const expected = getServerEnvironment().ADMIN_PASSWORD;
  return timingSafeEqual(digest(candidate), digest(expected));
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getServerEnvironment().ADMIN_SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

export function createAdminSessionToken(now = Date.now()): string {
  const payload: AdminSessionPayload = {
    expiresAt: Math.floor(now / 1000) + ADMIN_SESSION_LIFETIME_SECONDS,
    version: 1,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function isValidAdminSessionToken(
  token: string | undefined,
  now = Date.now(),
): boolean {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);
  if (!timingSafeEqual(digest(signature), digest(expectedSignature))) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<AdminSessionPayload>;

    return (
      payload.version === 1 &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Math.floor(now / 1000)
    );
  } catch {
    return false;
  }
}

export function requireAdmin(request: NextRequest): void {
  if (!hasValidAdminSession(request)) {
    throw new AppError(
      "ADMIN_AUTH_REQUIRED",
      "Enter the admin password to continue.",
      401,
    );
  }
}

export function hasValidAdminSession(request: NextRequest): boolean {
  return isValidAdminSessionToken(
    request.cookies.get(ADMIN_COOKIE_NAME)?.value,
  );
}

export function setAdminSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: createAdminSessionToken(),
    httpOnly: true,
    secure: getServerEnvironment().NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_LIFETIME_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: getServerEnvironment().NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
