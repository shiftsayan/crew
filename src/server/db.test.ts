import { describe, expect, it } from "vitest";

import { databasePoolConfig } from "@/server/db";
import type { ServerEnvironment } from "@/server/env";
import { createTestDatabaseUrl } from "@/test/database-url";

function environment(databaseUrl: string): ServerEnvironment {
  return {
    DATABASE_URL: databaseUrl,
    ADMIN_PASSWORD: "test-password",
    ADMIN_SESSION_SECRET: "a".repeat(32),
    NODE_ENV: "test",
  };
}

describe("database pool configuration", () => {
  it("uses an ordinary unencrypted connection for local Supabase", () => {
    const databaseUrl = createTestDatabaseUrl();
    const config = databasePoolConfig(environment(databaseUrl));

    expect(config.connectionString).toBe(databaseUrl);
    expect(config.ssl).toBeUndefined();
  });

  it("verifies hosted Supabase with the bundled root CA", () => {
    const databaseUrl = createTestDatabaseUrl({
      hostname: "aws-0-us-east-1.pooler.supabase.com",
      password: "password",
      port: 6543,
      sslmode: "require",
      username: "postgres.ref",
    });
    const config = databasePoolConfig(
      environment(databaseUrl),
    );

    expect(config.connectionString).not.toContain("sslmode");
    expect(config.ssl).toMatchObject({
      rejectUnauthorized: true,
      ca: expect.stringContaining("BEGIN CERTIFICATE"),
    });
  });
});
