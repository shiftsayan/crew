import { describe, expect, it } from "vitest";

import { databasePoolConfig } from "@/server/db";
import type { ServerEnvironment } from "@/server/env";

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
    const config = databasePoolConfig(
      environment(
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      ),
    );

    expect(config.connectionString).toBe(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    );
    expect(config.ssl).toBeUndefined();
  });

  it("verifies hosted Supabase with the bundled root CA", () => {
    const config = databasePoolConfig(
      environment(
        "postgresql://postgres.ref:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require",
      ),
    );

    expect(config.connectionString).not.toContain("sslmode");
    expect(config.ssl).toMatchObject({
      rejectUnauthorized: true,
      ca: expect.stringContaining("BEGIN CERTIFICATE"),
    });
  });
});
