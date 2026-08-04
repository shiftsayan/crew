import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";

import {
  getServerEnvironment,
  type ServerEnvironment,
} from "@/server/env";

const globalDatabase = globalThis as typeof globalThis & {
  crewDatabasePool?: Pool;
};

function createPool(): Pool {
  const environment = getServerEnvironment();
  const pool = new Pool(databasePoolConfig(environment));

  pool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL client error", error);
  });

  return pool;
}

export function databasePoolConfig(
  environment: ServerEnvironment,
): PoolConfig {
  const databaseUrl = new URL(environment.DATABASE_URL);
  const isLocal =
    databaseUrl.hostname === "localhost" ||
    databaseUrl.hostname === "127.0.0.1" ||
    databaseUrl.hostname === "::1";

  // node-postgres replaces an explicit `ssl` object when the URL contains an
  // SSL query option. Strip those options so the downloaded Supabase root CA
  // remains authoritative and hostname verification stays enabled.
  for (const option of [
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
  ]) {
    databaseUrl.searchParams.delete(option);
  }

  return {
    connectionString: databaseUrl.toString(),
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true,
    ...(isLocal
      ? {}
      : {
          ssl: {
            ca: readFileSync(
              join(process.cwd(), "certs", "supabase-ca-2021.crt"),
              "utf8",
            ),
            rejectUnauthorized: true,
          },
        }),
  };
}

export function getPool(): Pool {
  if (!globalDatabase.crewDatabasePool) {
    globalDatabase.crewDatabasePool = createPool();
  }

  return globalDatabase.crewDatabasePool;
}

export function query<Row extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<QueryResult<Row>> {
  return getPool().query<Row>(text, [...values]);
}

export async function withTransaction<Result>(
  operation: (client: PoolClient) => Promise<Result>,
): Promise<Result> {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
