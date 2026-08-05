import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  CURRENT_STATE_VERSION,
  createPreflightState,
  type GameState,
} from "@/game";
import { PlayerTag } from "@/game/player-tags";
import { getPool } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  applyPlayerRoomCommand,
  createAdminRoom,
  getAdminRoom,
  getPlayerRoom,
  loginPlayer,
  runAdminRoomAction,
  saveAdminRoomSettings,
  updateAdminPlayer,
  updateAdminRoom,
} from "@/server/rooms";
import { createTestDatabaseUrl } from "@/test/database-url";

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
        createTestDatabaseUrl({
          hostname: "db.example.supabase.co",
          password: "password",
          port: 5432,
        }),
      ),
    ).toThrow(/local Supabase endpoint/);
    expect(() => requireLocalDatabaseUrl("not a database URL")).toThrow(
      /valid PostgreSQL URL/,
    );
  });

  it("accepts only PostgreSQL URLs on explicit loopback hosts", () => {
    expect(
      requireLocalDatabaseUrl(createTestDatabaseUrl()),
    ).toContain("127.0.0.1");
    expect(() =>
      requireLocalDatabaseUrl(
        createTestDatabaseUrl({ protocol: "http" }),
      ),
    ).toThrow(/local Supabase endpoint/);
    expect(() =>
      requireLocalDatabaseUrl(
        createTestDatabaseUrl({ port: 5432 }),
      ),
    ).toThrow(/local Supabase endpoint/);
    expect(() =>
      requireLocalDatabaseUrl(
        createTestDatabaseUrl({ username: "application" }),
      ),
    ).toThrow(/local Supabase endpoint/);
    expect(() =>
      requireLocalDatabaseUrl(
        createTestDatabaseUrl({ database: "crew" }),
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
        overrides.stateVersion ?? CURRENT_STATE_VERSION,
        JSON.stringify(overrides.state ?? { phase: "preflight" }),
      ],
    );
    const id = result.rows[0].id;
    roomIds.add(id);
    return id;
  }

  async function insertPlayer(input: {
    displayName: string;
    roomId: string;
    seat: number;
  }): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `
        insert into private.room_players (
          room_id,
          display_name,
          seat
        )
        values ($1, $2, $3)
        returning id
      `,
      [input.roomId, input.displayName, input.seat],
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
        }
      | {
          editionKey: "deep-sea";
          missionKey: "deep-sea:32";
        } = {
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
    },
  ): Promise<{
    id: string;
    name: string;
    players: Array<{ id: string; name: string }>;
  }> {
    const name = uniqueRoomName("api-room");
    const state = createPreflightState(game);
    const id = await insertRoom({
      name,
      state,
      editionKey: game.editionKey,
      missionKey: game.missionKey,
    });
    const fixtures = [
      { displayName: "Ada", seat: 1 },
      { displayName: "Grace", seat: 2 },
      { displayName: "Katherine", seat: 3 },
    ];
    const players: Array<{ id: string; name: string }> = [];

    for (const fixture of fixtures) {
      players.push({
        id: await insertPlayer({
          roomId: id,
          displayName: fixture.displayName,
          seat: fixture.seat,
        }),
        name: fixture.displayName,
      });
    }

    await applyPlayerRoomCommand(name, players[0].name, {
      type: "start-mission",
    });
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

    const retiredColorColumn = await pool.query<{ exists: boolean }>(
      `
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'private'
            and table_name = 'room_players'
            and column_name = 'color'
        ) as exists
      `,
    );
    expect(retiredColorColumn.rows[0].exists).toBe(false);

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
    await expectSqlState(insertRoom({ name: "has space" }), "23514");
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

  it("creates rooms without a mission and supports assigning and unsetting one", async () => {
    const name = uniqueRoomName("missionless");
    const created = await createAdminRoom({
      name,
      editionKey: "deep-sea",
    });
    roomIds.add(created.id);

    expect(created).toMatchObject({
      missionKey: null,
      missionNumber: null,
      missionTitle: null,
      stateVersion: null,
      phase: "missionless",
      attemptNumber: null,
      restartRequired: false,
    });

    await insertPlayer({ roomId: created.id, displayName: "Ada", seat: 1 });
    await expect(getPlayerRoom(name, "Ada")).rejects.toMatchObject({
      code: "MISSION_UNSET",
      status: 409,
    });

    const assigned = await updateAdminRoom(created.id, {
      missionKey: "deep-sea:1",
      confirmReset: false,
    });
    expect(assigned).toMatchObject({
      missionKey: "deep-sea:1",
      phase: "preflight",
      attemptNumber: 1,
    });
    await expect(getPlayerRoom(name, "Ada")).resolves.toMatchObject({
      phase: "preflight",
      mission: { missionKey: "deep-sea:1" },
    });

    const unset = await updateAdminRoom(created.id, {
      missionKey: null,
      confirmReset: false,
    });
    expect(unset).toMatchObject({
      missionKey: null,
      stateVersion: null,
      phase: "missionless",
      attemptNumber: null,
    });
  });

  it("moves a completed final mission into the missionless phase", async () => {
    const room = await createPlayableRoom({
      editionKey: "deep-sea",
      missionKey: "deep-sea:32",
    });
    const stored = await pool.query<{ state: GameState }>(
      "select state from private.rooms where id = $1",
      [room.id],
    );
    const finished = stored.rows[0].state;
    finished.phase = "finished";
    finished.result = "won";
    finished.currentPlayerId = null;
    finished.tasks = finished.tasks.map((task, index) => ({
      ...task,
      ownerPlayerId: room.players[index % room.players.length].id,
    }));
    finished.assignmentTurns = finished.tasks.length;
    await pool.query(
      "update private.rooms set state = $2::jsonb where id = $1",
      [room.id, JSON.stringify(finished)],
    );

    expect((await getAdminRoom(room.id)).phase).toBe("finished");
    const advanced = await runAdminRoomAction(room.id, "advance");
    expect(advanced).toMatchObject({
      editionKey: "deep-sea",
      missionKey: null,
      phase: "missionless",
      attemptNumber: null,
      restartRequired: false,
    });
  });

  it("enforces scoped player identities, seats, and room ownership", async () => {
    const firstRoomId = await insertRoom();
    const secondRoomId = await insertRoom();
    await insertPlayer({
      roomId: firstRoomId,
      displayName: "Alex",
      seat: 1,
    });

    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "alex",
        seat: 2,
      }),
      "23505",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "Casey",
        seat: 1,
      }),
      "23505",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "has space",
        seat: 2,
      }),
      "23514",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: " Drew ",
        seat: 2,
      }),
      "23514",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "x".repeat(33),
        seat: 2,
      }),
      "23514",
    );
    await expectSqlState(
      insertPlayer({
        roomId: firstRoomId,
        displayName: "Emery",
        seat: 6,
      }),
      "23514",
    );
    await expectSqlState(
      insertPlayer({
        roomId: randomUUID(),
        displayName: "Finley",
        seat: 1,
      }),
      "23503",
    );

    await expect(
      insertPlayer({
        roomId: secondRoomId,
        displayName: "Alex",
        seat: 1,
      }),
    ).resolves.toMatch(/^[0-9a-f-]{36}$/);
  });

  it("deleting a room cascades to its roster", async () => {
    const roomId = await insertRoom();
    await insertPlayer({
      roomId,
      displayName: "Alex",
      seat: 1,
    });
    await insertPlayer({
      roomId,
      displayName: "Blair",
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

  it("lets a player start preflight and returns admin-selected levels to preflight", async () => {
    const name = uniqueRoomName("start-room");
    const id = await insertRoom({
      name,
      state: createPreflightState({
        editionKey: "planet-nine",
        missionKey: "planet-nine:1",
      }),
    });
    const fixtures = [
      { displayName: "Ada", seat: 1 },
      { displayName: "Grace", seat: 2 },
      { displayName: "Katherine", seat: 3 },
    ];
    for (const fixture of fixtures) {
      await insertPlayer({ roomId: id, ...fixture });
    }

    const preflight = await getPlayerRoom(name, fixtures[0].displayName);
    expect(preflight.phase).toBe("preflight");
    expect(preflight.legalActions.canStartMission).toBe(true);

    const started = await applyPlayerRoomCommand(
      name,
      fixtures[0].displayName,
      { type: "start-mission" },
    );
    expect(started.phase).not.toBe("preflight");
    expect(started.legalActions.canStartMission).toBe(false);

    const changed = await updateAdminRoom(id, {
      editionKey: "planet-nine",
      missionKey: "planet-nine:2",
      confirmReset: true,
    });
    expect(changed.missionKey).toBe("planet-nine:2");
    expect(changed.phase).toBe("preflight");
    expect(changed.attemptNumber).toBe(started.mission.attemptNumber + 1);

    const changedPreflight = await getPlayerRoom(name, fixtures[0].displayName);
    expect(changedPreflight.legalActions.canStartMission).toBe(true);
    const changedStarted = await applyPlayerRoomCommand(
      name,
      fixtures[0].displayName,
      { type: "start-mission" },
    );
    expect(changedStarted.mission.missionKey).toBe("planet-nine:2");
    expect(changedStarted.phase).not.toBe("preflight");
  });

  it("persists player tags and projects them without restarting an active attempt", async () => {
    const room = await createPlayableRoom();
    const before = await getPlayerRoom(
      room.name,
      room.players[0].name,
    );

    const updated = await updateAdminPlayer(room.id, room.players[0].id, {
      tags: [PlayerTag.Bug, PlayerTag.AlwaysRed],
      confirmReset: false,
    });

    expect(updated.phase).toBe(before.phase);
    expect(updated.attemptNumber).toBe(before.mission.attemptNumber);
    expect(updated.players[0].tags).toEqual(["bug", "always-red"]);

    const projection = await getPlayerRoom(
      room.name,
      room.players[0].name,
    );
    expect(projection.self.tags).toEqual(["bug", "always-red"]);
    expect(
      projection.players.find((player) => player.id === room.players[0].id)
        ?.tags,
    ).toEqual(["bug", "always-red"]);
  });

  it("updates the attempt counter without restarting a valid active room", async () => {
    const room = await createPlayableRoom();
    const before = await getAdminRoom(room.id);
    const desiredAttemptNumber = before.attemptNumber! + 5;

    const updated = await saveAdminRoomSettings(room.id, {
      editionKey: before.editionKey as "planet-nine",
      missionKey: before.missionKey,
      attemptNumber: desiredAttemptNumber,
      confirmReset: false,
      players: [
        ...before.players.map((player) => ({
          id: player.id,
          displayName: player.displayName,
          tags: player.tags,
          seat: player.seat,
        })),
        { displayName: "", tags: [], seat: 4 },
        { displayName: "", tags: [], seat: 5 },
      ],
    });

    expect(updated.phase).toBe(before.phase);
    expect(updated.attemptNumber).toBe(desiredAttemptNumber);
    const projection = await getPlayerRoom(room.name, room.players[0].name);
    expect(projection.phase).toBe(before.phase);
    expect(projection.mission.attemptNumber).toBe(desiredAttemptNumber);
  });

  it("atomically reconciles all five admin player slots", async () => {
    const room = await createPlayableRoom();
    const before = await getAdminRoom(room.id);

    const updated = await saveAdminRoomSettings(room.id, {
      editionKey: "planet-nine",
      missionKey: "planet-nine:1",
      confirmReset: true,
      players: [
        {
          id: room.players[1].id,
          displayName: "Ada",
          tags: [PlayerTag.Bug],
          seat: 1,
        },
        {
          id: room.players[0].id,
          displayName: "Grace",
          tags: [],
          seat: 2,
        },
        {
          displayName: "Linus",
          tags: [PlayerTag.AlwaysRed],
          seat: 3,
        },
        { displayName: "", tags: [], seat: 4 },
        { displayName: "", tags: [], seat: 5 },
      ],
    });

    expect(updated.phase).toBe("preflight");
    expect(updated.attemptNumber).toBe(before.attemptNumber! + 1);
    expect(updated.players).toHaveLength(3);
    expect(updated.players.map(({ displayName, seat }) => ({ displayName, seat }))).toEqual([
      { displayName: "Ada", seat: 1 },
      { displayName: "Grace", seat: 2 },
      { displayName: "Linus", seat: 3 },
    ]);
    expect(updated.players[0]).toMatchObject({
      id: room.players[1].id,
      tags: ["bug"],
    });
    expect(updated.players[2]).toMatchObject({
      tags: ["always-red"],
    });
    expect(updated.players.some(({ id }) => id === room.players[2].id)).toBe(
      false,
    );
  });

  it("shuffles player seats and resets an active attempt", async () => {
    const room = await createPlayableRoom();
    const before = await getAdminRoom(room.id);

    const shuffled = await runAdminRoomAction(room.id, "shuffle", true);

    expect(shuffled.phase).toBe("preflight");
    expect(shuffled.attemptNumber).toBe(before.attemptNumber! + 1);
    expect(shuffled.players.map((player) => player.seat)).toEqual([1, 2, 3]);
    expect(shuffled.players.map((player) => player.id)).not.toEqual(
      before.players.map((player) => player.id),
    );
    expect(new Set(shuffled.players.map((player) => player.id))).toEqual(
      new Set(before.players.map((player) => player.id)),
    );
  });

  it("serializes simultaneous claims and Start Trick confirmations", async () => {
    const room = await createPlayableRoom();
    const observerProjection = await getPlayerRoom(
      room.name,
      room.players[0].name,
    );
    const [firstPlayer, secondPlayer] = room.players;
    const taskId = observerProjection.tasks[0]?.id;

    expect(firstPlayer).toBeDefined();
    expect(secondPlayer).toBeDefined();
    expect(taskId).toBeDefined();

    const results = await Promise.allSettled([
      applyPlayerRoomCommand(room.name, firstPlayer!.name, {
        type: "claim-task",
        taskId: taskId!,
      }),
      applyPlayerRoomCommand(room.name, secondPlayer!.name, {
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

    const latest = await getPlayerRoom(
      room.name,
      firstPlayer!.name,
    );
    expect(latest.phase).toBe("ready-to-start-trick");
    expect(latest.legalActions.canStartTrick).toBe(true);
    expect(latest.tasks).toEqual([
      expect.objectContaining({ id: taskId }),
    ]);
    expect([firstPlayer!.id, secondPlayer!.id]).toContain(
      latest.tasks[0]?.ownerPlayerId,
    );

    const startResults = await Promise.allSettled([
      applyPlayerRoomCommand(room.name, firstPlayer!.name, {
        type: "start-trick",
      }),
      applyPlayerRoomCommand(room.name, secondPlayer!.name, {
        type: "start-trick",
      }),
    ]);
    expect(
      startResults.filter(({ status }) => status === "fulfilled"),
    ).toHaveLength(1);
    const rejectedStart = startResults.find(
      ({ status }) => status === "rejected",
    ) as PromiseRejectedResult | undefined;
    expect(rejectedStart?.reason).toBeInstanceOf(AppError);
    expect(rejectedStart?.reason).toMatchObject({
      code: "INVALID_PHASE",
      status: 409,
    });

    const readyToPlay = await getPlayerRoom(room.name, firstPlayer!.name);
    expect(readyToPlay).toMatchObject({
      phase: "between-tricks",
      currentTrick: null,
      lastTrick: null,
    });
    expect(
      readyToPlay.players.filter((player) => player.isCurrent),
    ).toEqual([
        expect.objectContaining({ isCaptain: true }),
      ]);

    const leader = readyToPlay.players.find((player) => player.isCurrent);
    const leaderName = room.players.find((player) => player.id === leader?.id)?.name;
    expect(leaderName).toBeDefined();
    const leaderProjection = await getPlayerRoom(room.name, leaderName!);
    expect(leaderProjection.legalActions.canStartTrick).toBe(true);

    const begun = await applyPlayerRoomCommand(room.name, leaderName!, {
      type: "begin-trick",
    });
    expect(begun).toMatchObject({
      phase: "playing-trick",
      currentTrick: {
        number: 1,
        leaderPlayerId: leader?.id,
        plays: [],
        winnerPlayerId: null,
      },
      legalActions: { canStartTrick: false },
    });
  });

  it("requires an admin reset for incompatible or corrupt state and preserves the roster", async () => {
    const room = await createPlayableRoom({
      editionKey: "deep-sea",
      missionKey: "deep-sea:1",
    });
    const originalLogin = await loginPlayer(
      room.name,
      room.players[0].name,
    );

    await pool.query(
      `update private.rooms set state_version = 999 where id = $1`,
      [room.id],
    );
    await expect(
      getPlayerRoom(room.name, room.players[0].name),
    ).rejects.toMatchObject({
      code: "LEVEL_RESTART_REQUIRED",
      status: 409,
    });

    const afterIncompatibleReset = await runAdminRoomAction(
      room.id,
      "return-to-preflight",
    );
    expect(afterIncompatibleReset).toMatchObject({
      restartRequired: false,
      stateVersion: CURRENT_STATE_VERSION,
      phase: "preflight",
      playerCount: 3,
    });
    await expect(
      loginPlayer(room.name, room.players[0].name),
    ).resolves.toEqual(originalLogin);

    await applyPlayerRoomCommand(room.name, room.players[0].name, {
      type: "start-mission",
    });
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
      getPlayerRoom(room.name, room.players[0].name),
    ).rejects.toMatchObject({
      code: "LEVEL_RESTART_REQUIRED",
      status: 409,
    });
    await expect(
      runAdminRoomAction(room.id, "return-to-preflight"),
    ).resolves.toMatchObject({
      restartRequired: false,
      stateVersion: CURRENT_STATE_VERSION,
      phase: "preflight",
      playerCount: 3,
    });

    await pool.query(
      `update private.rooms set state = $2::jsonb where id = $1`,
      [room.id, JSON.stringify({ phase: "preflight" })],
    );
    await expect(
      getPlayerRoom(room.name, room.players[0].name),
    ).rejects.toMatchObject({
      code: "LEVEL_RESTART_REQUIRED",
      status: 409,
    });

    const afterCorruptReset = await runAdminRoomAction(
      room.id,
      "return-to-preflight",
    );
    expect(afterCorruptReset).toMatchObject({
      restartRequired: false,
      stateVersion: CURRENT_STATE_VERSION,
      phase: "preflight",
      playerCount: 3,
    });
    expect(afterCorruptReset.players.map(({ id, displayName, seat }) => ({
      id,
      displayName,
      seat,
    }))).toEqual(
      room.players.map((player, index) => ({
        id: player.id,
        displayName: player.name,
        seat: index + 1,
      })),
    );

    const semanticallyCorruptPreflight = createPreflightState({
      editionKey: "deep-sea",
      missionKey: "deep-sea:1",
    });
    semanticallyCorruptPreflight.trickNumber = 1;
    await pool.query(
      `update private.rooms set state = $2::jsonb where id = $1`,
      [room.id, JSON.stringify(semanticallyCorruptPreflight)],
    );
    await expect(getAdminRoom(room.id)).resolves.toMatchObject({
      phase: "restart-required",
      restartRequired: true,
      playerCount: 3,
    });
    await expect(
      runAdminRoomAction(room.id, "return-to-preflight"),
    ).resolves.toMatchObject({
      restartRequired: false,
      phase: "preflight",
      playerCount: 3,
    });
  });
});
