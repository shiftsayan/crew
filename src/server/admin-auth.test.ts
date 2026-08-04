import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAdminSessionToken,
  isValidAdminSessionToken,
  passwordMatches,
} from "@/server/admin-auth";
import { clearServerEnvironmentCacheForTests } from "@/server/env";
import { createTestDatabaseUrl } from "@/test/database-url";

const originalEnvironment = { ...process.env };

describe("admin authentication", () => {
  beforeEach(() => {
    Object.assign(process.env, {
      DATABASE_URL: createTestDatabaseUrl(),
      ADMIN_PASSWORD: "correct horse battery staple",
      ADMIN_SESSION_SECRET:
        "test-secret-with-at-least-thirty-two-characters",
      NODE_ENV: "test",
    });
    clearServerEnvironmentCacheForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
    clearServerEnvironmentCacheForTests();
  });

  it("checks the configured password without accepting a near match", () => {
    expect(passwordMatches("correct horse battery staple")).toBe(true);
    expect(passwordMatches("correct horse battery stapler")).toBe(false);
  });

  it("accepts a valid signed token until its eight-hour expiry", () => {
    const issuedAt = Date.UTC(2026, 6, 30, 12);
    const token = createAdminSessionToken(issuedAt);

    expect(isValidAdminSessionToken(token, issuedAt + 60_000)).toBe(true);
    expect(
      isValidAdminSessionToken(token, issuedAt + 8 * 60 * 60 * 1_000 + 1),
    ).toBe(false);
  });

  it("rejects a modified token", () => {
    const token = createAdminSessionToken();
    expect(isValidAdminSessionToken(`${token}changed`)).toBe(false);
  });
});
