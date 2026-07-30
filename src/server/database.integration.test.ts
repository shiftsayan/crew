import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createSetupState } from "@/game";
import { getPool } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  applyPlayerRoomCommand,
  getAdminRoom,
  getPlayerRoom,
  loginPlayer,
  runAdminRoomAction,
} from "@/server/rooms";

const RUN_DATABASE_TESTS = process.env.CREW_RUN_DB_TESTS === "1";
const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const LOCAL_DATABASE_PORT = "54322";
const LOCAL_DATABASE_USER = "postgres";
const LOCAL_DATABASE_NAME = "/postgres";
const databaseDescribe = RUN_DATABASE_TESTS ? describe : describe.skip;

function requireLocalDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error(
      "DATABASE_URL is required when CREW_RUN_DB_TESTS=1.",
    );
  }

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    !LOCAL_DATABASE_HOSTS.has(databaseUrl.hostname) ||
    databaseUrl.port !== LOCAL_DATABASE_PORT ||
    databaseUrl.username !== LOCAL_DATABASE_USER ||
    databaseUrl.pathname !== LOCAL_DATABASE_NAME
  ) {
    throw new Error(
      "Database integration tests refuse DATABASE_URL values outside the local Supabase endpoint.",
    );
  }

  return value;
}

if (RUN_DATABASE_TESTS) {
  requireLocalDatabaseUrl(process.env.DATABASE_URL);
}

describe("database integration safety guard", () => {
  it("rejects hosted and malformed database URLs", () => {
    expect(() =>
      requireLocalDatabaseUrl(
        "postgresql://postgres:password@db.example.supabase.co:5432/postgres",
      ),
    ).toThrow(/local Supabase endpoint/);
    expect(() => requireLocalDatabaseUrl("not a database URL")).toThrow(
      /valid PostgreSQL URL/,
    );
  });

  it("accepts only PostgreSQL URLs on explicit loopback hosts", () => {
    expect(
      requireLocalDatabaseUrl(
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      ),
    ).toContain("127.0.0.1");
    expect(() =>
      requireLocalDatabaseUrl(
        "https://postgres:postgres@127.0.0.1:54322/postgres",
      ),
    ).toThrow(/local Supabase endpoint/);
    expect(() =>
      requireLocalDatabaseUrl(
        "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
      ),
    ).toThrow(/local Supabase endpoint/);
    expect(() =>
      requireLocalDatabaseUrl(
        "postgresql://application:postgres@127.0.0.1:54322/postgres",
      ),
    ).toThrow(/local Supabase endpoint/);
    expect(() =>
      requireLocalDatabaseUrl(
        "postgresql://postgres:postgres@127.0.0.1:54322/crew",
      ),
    ).toThrow(/local Supabase endpoint/);
  });
});

databaseDescribe("private database schema", () => {
  let pool: Pool;
  const roomIds = new Set<string>();

  function uniqueRoomName(label: string): string {
    const token = randomUUID().replaceAll("-", "").slice(0, 12);
    return `${label}-${token}`.slice(0, 32);
  }

  async function insertRoom(
    overrides: {
      editionKey?: string;
      missionKey?: string;
      name?: string;
      state?: unknown;
      stateVersion?: number;
    } = {},
  ): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `
        insert into private.rooms (
          name,
          edition_key,
          mission_key,
          state_version,
          state
        )
        values ($1, $2, $3, $4, $5::jsonb)
        returning id
      `,
      [
        overrides.name ?? uniqueRoomName("room"),
        overrides.editionKey ?? "planet-nine",
        overrides.missionKey ?? "planet-nine:1",
        overrides.stateVersion ?? 1,
        JSON.stringify(overrides.state ?? { phase: "setup" }),
      ],
    );
    const id = result.rows[0].id;
    roomIds.add(id);
    return id;
  }

  async function insertPlayer(input: {
    displayName: string;
    loginKey: string;
    roomId: string;
    seat: number;
  }): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `
        insert into private.room_players (
          room_id,
          display_name,
          login_key,
          seat
        )
        values ($1, $2, $3, $4)
        returning id
      `,
      [input.roomId, input.displayName, input.loginKey, input.seat],
    );
    return result.rows[0].id;
  }

  async function createPlayableRoom(
    game:
      | {
          editionKey: "planet-nine";
          missionKey: "planet-nine:1";
        }
      | {
          editionKey: "deep-sea";
          missionKey: "deep-sea:1";
        } = {
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    },
  ): Promise<{
    id: string;
    name: string;
    players: Array<{ id: string; key: string }>;
  }> {
    const name = uniqueRoomName("api-room");
    const state = createSetupState(game);
    const id = await insertRoom({
      name,
      state,
      editionKey: game.editionKey,
      missionKey: game.missionKey,
    });
    const fixtures = [
      { displayName: "Ada", key: "ABC2DE", seat: 1 },
      { displayName: "Grace", key: "FGH3JK", seat: 2 },
      { displayName: "Katherine", key: "LMN4PQ", seat: 3 },
    ];
    const players: Array<{ id: string; key: string }> = [];

    for (const fixture of fixtures) {
      players.push({
        id: await insertPlayer({
          roomId: id,
          displayName: fixture.displayName,
          loginKey: fixture.key,
          seat: fixture.seat,
        }),
        key: fixture.key,
      });
    }

    await runAdminRoomAction(id, "start");
    return { id, name, players };
  }

  async function expectSqlState(
    operation: Promise<unknown>,
    code: "23503" | "23505" | "23514",
  ): Promise<void> {
    await expect(operation).rejects.toMatchObject({ code });
  }

  beforeAll(() => {
    process.env.ADMIN_PASSWORD ??= "database-integration-test";
    process.env.ADMIN_SESSION_SECRET ??= "i".repeat(32);
    pool = new Pool({
      connectionString: requireLocalDatabaseUrl(process.env.DATABASE_URL),
      max: 2,
    });
  });

  afterEach(async () => {
    const ids = [...roomIds];
    roomIds.clear();
    if (ids.length > 0) {
      await pool.query("delete from private.rooms where id = any($1::uuid[])", [
        ids,
      ]);
    }
  });

  afterAll(async () => {
    await pool.end();
    await getPool().end();
  });

  it("applies only the two application tables in the private schema", async () => {
    const tables = await pool.query<{ table_name: string }>(
      `
        select table_name
        from information_schema.tables
        where table_schema = 'private'
          and table_type = 'BASE TABLE'
        order by table_name
      `,
    );

    expect(tables.rows.map(({ table_name }) => table_name)).toEqual([
      "room_players",
      "rooms",
    ]);

    const privileges = await pool.query<{
      anonSchemaUsage: boolean;
      anonTableSelect: boolean;
      authenticatedSchemaUsage: boolean;
      authenticatedTableSelect: boolean;
    }>(
      `
        select
          has_schema_privilege('anon', 'private', 'USAGE')
            as "anonSchemaUsage",
          has_table_privilege('anon', 'private.rooms', 'SELECT')
            as "anonTableSelect",
          has_schema_privilege('authenticated', 'private', 'USAGE')
            as "authenticatedSchemaUsage",
          has_table_privilege('authenticated', 'private.rooms', 'SELECT')
            as "authenticatedTableSelect"
      `,
    );

    expect(privileges.rows[0]).toEqual({
      anonSchemaUsage: false,
      anonTableSelect: false,
      authenticatedSchemaUsage: false,
      authenticatedTableSelect: false,
    });
  });

  it("enforces room format, catalog, state, and case-insensitive name constraints", async () => {
    const name = uniqueRoomName("case-room");
    await insertRoom({ name });

    await expectSqlState(
      insertRoom({ name: name.toUpperCase() }),
      "23505",
    );
    await expectSqlState(insertRoom({ name: " leading-space" }), "23514");
    await expectSqlState(insertRoom({ name: "x" }), "23514");
    await expectSqlState(
      insertRoom({ name: "x".repeat(33) }),
      "23514",
    );
    await expectSqlState(insertRoom({ name: "invalid/room" }), "23514");
    await expectSqlState(
      insertRoom({ editionKey: "unknown-edition" }),
      "23514",
    );
    await expectSqlState(
      insertRoom({ missionKey: "invalid mission key" }),
      "23514",
    );
    await expectSqlState(insertRoom({ stateVersion: 0 }), "23514");
    await expectSqlState(insertRoom({ state: ["not", "an", "object"] }), "23514");
  });

  it("enforces scoped player identities, seats, keys, and room ownership", async () => {
    const firstRoomId = await insertRoom();
    const secondRoomId = await insertRoom();
    await insertPlayer({
      roomId: firstRoomId,
      displayName: "Alex",
      loginKey: "ABC2DE",
      seat: 1,
    });

    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "Blair",
        loginKey: "ABC2DE",
        seat: 2,
      }),
      "23505",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "alex",
        loginKey: "FGH3JK",
        seat: 2,
      }),
      "23505",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "Casey",
        loginKey: "LMN4PQ",
        seat: 1,
      }),
      "23505",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "Drew",
        loginKey: "ABC1DE",
        seat: 2,
      }),
      "23514",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "Drew",
        loginKey: "abc2de",
        seat: 2,
      }),
      "23514",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: " Drew ",
        loginKey: "RST5UV",
        seat: 2,
      }),
      "23514",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "x".repeat(33),
        loginKey: "RST5UV",
        seat: 2,
      }),
      "23514",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "Emery",
        loginKey: "RST5UV",
        seat: 6,
      }),
      "23514",
    );
    await expectSqlState(
      insertPlayer({
        roomId: randomUUID(),
        displayName: "Finley",
        loginKey: "WXY6Z2",
        seat: 1,
      }),
      "23503",
    );

    await expect(
      insertPlayer({
        roomId: secondRoomId,
        displayName: "Alex",
        loginKey: "ABC2DE",
        seat: 1,
      }),
    ).resolves.toMatch(/^[0-9a-f-]{36}$/);
  });

  it("deleting a room cascades to its roster", async () => {
    const roomId = await insertRoom();
    await insertPlayer({
      roomId,
      displayName: "Alex",
      loginKey: "ABC2DE",
      seat: 1,
    });
    await insertPlayer({
      roomId,
      displayName: "Blair",
      loginKey: "FGH3JK",
      seat: 2,
    });

    await pool.query("delete from private.rooms where id = $1", [roomId]);
    roomIds.delete(roomId);

    const players = await pool.query<{ count: number }>(
      `
        select count(*)::integer as count
        from private.room_players
        where room_id = $1
      `,
      [roomId],
    );
    expect(players.rows[0].count).toBe(0);
  });

  it("serializes simultaneous commands and rejects the one that is stale after the lock", async () => {
    const room = await createPlayableRoom();
    const observerProjection = await getPlayerRoom(
      room.name,
      room.players[0].key,
    );
    const currentPlayerId = observerProjection.players.find(
      (player) => player.isCurrent,
    )?.id;
    const currentPlayer = room.players.find(
      (player) => player.id === currentPlayerId,
    );
    const taskId = observerProjection.tasks[0]?.id;

    expect(currentPlayer).toBeDefined();
    expect(taskId).toBeDefined();

    const results = await Promise.allSettled([
      applyPlayerRoomCommand(room.name, currentPlayer!.key, {
        type: "claim-task",
        taskId: taskId!,
      }),
      applyPlayerRoomCommand(room.name, currentPlayer!.key, {
        type: "claim-task",
        taskId: taskId!,
      }),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    const rejected = results.find(
      ({ status }) => status === "rejected",
    ) as PromiseRejectedResult | undefined;
    expect(rejected?.reason).toBeInstanceOf(AppError);
    expect(rejected?.reason).toMatchObject({
      code: "INVALID_PHASE",
      status: 409,
    });

    const latest = await getPlayerRoom(room.name, currentPlayer!.key);
    expect(latest.phase).toBe("between-tricks");
    expect(latest.tasks).toEqual([
      expect.objectContaining({
        id: taskId,
        ownerPlayerId: currentPlayer!.id,
      }),
    ]);
  });

  it("requires an admin restart for incompatible or corrupt state and preserves the roster", async () => {
    const room = await createPlayableRoom({
      editionKey: "deep-sea",
      missionKey: "deep-sea:1",
    });
    const originalLogin = await loginPlayer(room.name, room.players[0].key);

    await pool.query(
      `update private.rooms set state_version = 999 where id = $1`,
      [room.id],
    );
    await expect(
      getPlayerRoom(room.name, room.players[0].key),
    ).rejects.toMatchObject({
      code: "LEVEL_RESTART_REQUIRED",
      status: 409,
    });

    const afterIncompatibleRestart = await runAdminRoomAction(
      room.id,
      "restart",
    );
    expect(afterIncompatibleRestart).toMatchObject({
      restartRequired: false,
      stateVersion: 1,
      phase: "assigning-tasks",
      playerCount: 3,
    });
    await expect(
      loginPlayer(room.name, room.players[0].key),
    ).resolves.toEqual(originalLogin);

    const storedState = await pool.query<{
      state: { tasks: Array<{ definitionId: string }> };
    }>(`select state from private.rooms where id = $1`, [room.id]);
    const semanticallyCorruptState = structuredClone(
      storedState.rows[0].state,
    );
    semanticallyCorruptState.tasks[0].definitionId = "deep-sea-task-999";
    await pool.query(
      `update private.rooms set state = $2::jsonb where id = $1`,
      [room.id, JSON.stringify(semanticallyCorruptState)],
    );
    await expect(
      getPlayerRoom(room.name, room.players[0].key),
    ).rejects.toMatchObject({
      code: "LEVEL_RESTART_REQUIRED",
      status: 409,
    });
    await expect(
      runAdminRoomAction(room.id, "restart"),
    ).resolves.toMatchObject({
      restartRequired: false,
      stateVersion: 1,
      phase: "assigning-tasks",
      playerCount: 3,
    });

    await pool.query(
      `update private.rooms set state = $2::jsonb where id = $1`,
      [room.id, JSON.stringify({ phase: "setup" })],
    );
    await expect(
      getPlayerRoom(room.name, room.players[0].key),
    ).rejects.toMatchObject({
      code: "LEVEL_RESTART_REQUIRED",
      status: 409,
    });

    const afterCorruptRestart = await runAdminRoomAction(room.id, "restart");
    expect(afterCorruptRestart).toMatchObject({
      restartRequired: false,
      stateVersion: 1,
      phase: "assigning-tasks",
      playerCount: 3,
    });
    expect(afterCorruptRestart.players.map(({ id, loginKey, seat }) => ({
      id,
      loginKey,
      seat,
    }))).toEqual(
      room.players.map((player, index) => ({
        id: player.id,
        loginKey: player.key,
        seat: index + 1,
      })),
    );

    const semanticallyCorruptSetup = createSetupState({
      editionKey: "deep-sea",
      missionKey: "deep-sea:1",
    });
    semanticallyCorruptSetup.trickNumber = 1;
    await pool.query(
      `update private.rooms set state = $2::jsonb where id = $1`,
      [room.id, JSON.stringify(semanticallyCorruptSetup)],
    );
    await expect(getAdminRoom(room.id)).resolves.toMatchObject({
      phase: "restart-required",
      restartRequired: true,
      playerCount: 3,
    });
    await expect(
      runAdminRoomAction(room.id, "restart"),
    ).resolves.toMatchObject({
      restartRequired: false,
      phase: "assigning-tasks",
      playerCount: 3,
    });
  });
});
