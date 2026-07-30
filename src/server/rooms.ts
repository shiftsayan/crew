import "server-only";

import type { PoolClient } from "pg";

import {
  NON_TRUMP_CARD_IDS,
  getDeepSeaTask,
  getMission,
  type PlayerCount,
} from "@/game";
import {
  type AddPlayerInput,
  type AdminRoomAction,
  type AdminRoomDetail,
  type AdminRoomSummary,
  type CreateRoomInput,
  type PlayerRow,
  type RoomRow,
  type UpdatePlayerInput,
  type UpdateRoomInput,
} from "@/server/contracts";
import { query, withTransaction } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  CURRENT_STATE_VERSION,
  GameStateSchema,
  adminEditionOptions,
  assertMission,
  beginAttempt,
  makePlayerProjection,
  makeSetupState,
  nextMissionFor,
  runPlayerCommand,
  type ActorProjection,
  type GameState,
  type PlayerCommand,
} from "@/server/game-runtime";
import {
  PLAYER_KEY_PATTERN,
  generatePlayerKey,
  normalizePlayerKey,
} from "@/server/player-keys";

const roomColumns = `
  id,
  name,
  edition_key as "editionKey",
  mission_key as "missionKey",
  state_version as "stateVersion",
  state,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const playerColumns = `
  id,
  room_id as "roomId",
  display_name as "displayName",
  login_key as "loginKey",
  seat,
  created_at as "createdAt"
`;

export async function listAdminRooms(): Promise<AdminRoomSummary[]> {
  const result = await query<RoomRow & { playerCount: number }>(
    `
      select
        rooms.id,
        rooms.name,
        rooms.edition_key as "editionKey",
        rooms.mission_key as "missionKey",
        rooms.state_version as "stateVersion",
        rooms.state,
        rooms.created_at as "createdAt",
        rooms.updated_at as "updatedAt",
        count(players.id)::integer as "playerCount"
      from private.rooms rooms
      left join private.room_players players on players.room_id = rooms.id
      group by rooms.id
      order by rooms.updated_at desc, lower(rooms.name)
    `,
  );

  return result.rows.map((room) => adminSummary(room, room.playerCount));
}

export { adminEditionOptions };

export async function createAdminRoom(
  input: CreateRoomInput,
): Promise<AdminRoomDetail> {
  const mission = assertMission(input.editionKey, input.missionKey);
  const state = makeSetupState(mission.editionKey, mission.missionKey);

  const result = await query<RoomRow>(
    `
      insert into private.rooms (
        name,
        edition_key,
        mission_key,
        state_version,
        state
      )
      values ($1, $2, $3, $4, $5::jsonb)
      returning ${roomColumns}
    `,
    [
      input.name,
      mission.editionKey,
      mission.missionKey,
      CURRENT_STATE_VERSION,
      JSON.stringify(state),
    ],
  );

  return adminDetail(result.rows[0], []);
}

export async function getAdminRoom(roomId: string): Promise<AdminRoomDetail> {
  const roomResult = await query<RoomRow>(
    `select ${roomColumns} from private.rooms where id = $1`,
    [roomId],
  );
  const room = roomResult.rows[0];
  if (!room) {
    throw new AppError("NOT_FOUND", "Room not found.", 404);
  }

  const players = await getPlayers(roomId);
  return adminDetail(room, players);
}

export async function updateAdminRoom(
  roomId: string,
  input: UpdateRoomInput,
): Promise<AdminRoomDetail> {
  await withTransaction(async (client) => {
    const room = await getRoomForUpdate(client, roomId);
    const editionKey = input.editionKey ?? room.editionKey;
    const missionKey = input.missionKey ?? room.missionKey;
    const mission = assertMission(editionKey, missionKey);
    const gameChanged =
      mission.editionKey !== room.editionKey ||
      mission.missionKey !== room.missionKey;

    let state = room.state;
    let stateVersion = room.stateVersion;
    if (gameChanged) {
      const reset = resetStateForMutation(room, input.confirmReset);
      state = makeSetupState(
        mission.editionKey,
        mission.missionKey,
        reset.attemptNumber,
      );
      stateVersion = CURRENT_STATE_VERSION;
    }

    await client.query(
      `
        update private.rooms
        set
          name = $2,
          edition_key = $3,
          mission_key = $4,
          state_version = $5,
          state = $6::jsonb,
          updated_at = now()
        where id = $1
      `,
      [
        roomId,
        input.name ?? room.name,
        mission.editionKey,
        mission.missionKey,
        stateVersion,
        JSON.stringify(state),
      ],
    );
  });

  return getAdminRoom(roomId);
}

export async function deleteAdminRoom(roomId: string): Promise<void> {
  await withTransaction(async (client) => {
    await getRoomForUpdate(client, roomId);
    await client.query(`delete from private.rooms where id = $1`, [roomId]);
  });
}

export async function addAdminPlayer(
  roomId: string,
  input: AddPlayerInput,
): Promise<AdminRoomDetail> {
  await withTransaction(async (client) => {
    const room = await getRoomForUpdate(client, roomId);
    await resetRoomForRosterMutation(client, room, input.confirmReset);
    const players = await getPlayersWithClient(client, roomId);
    if (players.length >= 5) {
      throw new AppError(
        "CONFLICT",
        "A room can contain at most five players.",
        409,
      );
    }

    const seat = input.seat ?? firstAvailableSeat(players);
    if (seat > players.length + 1) {
      throw new AppError(
        "INVALID_REQUEST",
        "New players must use the next available seat.",
        400,
      );
    }
    if (players.some((player) => player.seat === seat)) {
      throw new AppError("CONFLICT", "That seat is already occupied.", 409);
    }

    const key = uniquePlayerKey(players);
    await client.query(
      `
        insert into private.room_players (
          room_id,
          display_name,
          login_key,
          seat
        )
        values ($1, $2, $3, $4)
      `,
      [roomId, input.displayName, key, seat],
    );
    await touchRoom(client, roomId);
  });

  return getAdminRoom(roomId);
}

export async function updateAdminPlayer(
  roomId: string,
  playerId: string,
  input: UpdatePlayerInput,
): Promise<AdminRoomDetail> {
  await withTransaction(async (client) => {
    const room = await getRoomForUpdate(client, roomId);
    await resetRoomForRosterMutation(client, room, input.confirmReset);
    const players = await getPlayersWithClient(client, roomId);
    const player = players.find((candidate) => candidate.id === playerId);
    if (!player) {
      throw new AppError("NOT_FOUND", "Player not found.", 404);
    }

    if (input.seat !== undefined && input.seat > players.length) {
      throw new AppError(
        "INVALID_REQUEST",
        "Choose an occupied seat to swap these players.",
        400,
      );
    }

    if (input.seat !== undefined && input.seat !== player.seat) {
      await client.query(
        "set constraints private.room_players_room_seat_key deferred",
      );
      const occupant = players.find(
        (candidate) => candidate.seat === input.seat,
      );
      if (occupant) {
        await client.query(
          `
            update private.room_players
            set seat = $3
            where room_id = $1 and id = $2
          `,
          [roomId, occupant.id, player.seat],
        );
      }
    }

    await client.query(
      `
        update private.room_players
        set
          display_name = $3,
          seat = $4
        where room_id = $1 and id = $2
      `,
      [
        roomId,
        playerId,
        input.displayName ?? player.displayName,
        input.seat ?? player.seat,
      ],
    );
    await touchRoom(client, roomId);
  });

  return getAdminRoom(roomId);
}

export async function deleteAdminPlayer(
  roomId: string,
  playerId: string,
  confirmReset: boolean,
): Promise<AdminRoomDetail> {
  await withTransaction(async (client) => {
    const room = await getRoomForUpdate(client, roomId);
    await resetRoomForRosterMutation(client, room, confirmReset);
    const result = await client.query(
      `delete from private.room_players where room_id = $1 and id = $2`,
      [roomId, playerId],
    );
    if (result.rowCount === 0) {
      throw new AppError("NOT_FOUND", "Player not found.", 404);
    }
    await compactPlayerSeats(client, roomId);
    await touchRoom(client, roomId);
  });

  return getAdminRoom(roomId);
}

export async function rotateAdminPlayerKey(
  roomId: string,
  playerId: string,
): Promise<AdminRoomDetail> {
  await withTransaction(async (client) => {
    await getRoomForUpdate(client, roomId);
    const players = await getPlayersWithClient(client, roomId);
    const player = players.find((candidate) => candidate.id === playerId);
    if (!player) {
      throw new AppError("NOT_FOUND", "Player not found.", 404);
    }

    const key = uniquePlayerKey(players);
    await client.query(
      `
        update private.room_players
        set login_key = $3
        where room_id = $1 and id = $2
      `,
      [roomId, playerId, key],
    );
    await touchRoom(client, roomId);
  });

  return getAdminRoom(roomId);
}

export async function runAdminRoomAction(
  roomId: string,
  action: AdminRoomAction,
): Promise<AdminRoomDetail> {
  await withTransaction(async (client) => {
    const room = await getRoomForUpdate(client, roomId);
    const players = await getPlayersWithClient(client, roomId);
    requirePlayableRoster(players);

    let state: GameState;
    let editionKey = room.editionKey;
    let missionKey = room.missionKey;

    if (action === "start") {
      const current = compatibleState(room, players);
      if (current.phase !== "setup") {
        throw new AppError(
          "CONFLICT",
          "This room has already started. Restart it to create a new attempt.",
          409,
        );
      }
      state = beginAttempt(current, players.map((player) => player.id));
    } else {
      let currentAttempt = attemptNumber(room);
      if (action === "advance") {
        const current = compatibleState(room, players);
        if (current.phase !== "finished") {
          throw new AppError(
            "CONFLICT",
            "Finish the current mission before advancing.",
            409,
          );
        }
        currentAttempt = current.attemptNumber;
        const nextMission = nextMissionFor(room.editionKey, room.missionKey);
        if (!nextMission) {
          throw new AppError(
            "CONFLICT",
            "This is the last configured mission in this edition.",
            409,
          );
        }
        editionKey = nextMission.editionKey;
        missionKey = nextMission.missionKey;
      }

      const setup = makeSetupState(
        editionKey,
        missionKey,
        currentAttempt + 1,
      );
      state = beginAttempt(setup, players.map((player) => player.id));
    }

    await client.query(
      `
        update private.rooms
        set
          edition_key = $2,
          mission_key = $3,
          state_version = $4,
          state = $5::jsonb,
          updated_at = now()
        where id = $1
      `,
      [
        roomId,
        editionKey,
        missionKey,
        CURRENT_STATE_VERSION,
        JSON.stringify(state),
      ],
    );
  });

  return getAdminRoom(roomId);
}

export async function loginPlayer(
  roomName: string,
  key: string,
): Promise<{
  room: { id: string; name: string };
  player: { id: string; displayName: string; seat: number };
}> {
  const normalizedKey = normalizePlayerKey(key);
  const result = await query<
    Pick<RoomRow, "id" | "name"> &
      Pick<PlayerRow, "displayName" | "seat"> & { playerId: string }
  >(
    `
      select
        rooms.id,
        rooms.name,
        players.id as "playerId",
        players.display_name as "displayName",
        players.seat
      from private.rooms rooms
      join private.room_players players on players.room_id = rooms.id
      where lower(rooms.name) = lower($1)
        and players.login_key = $2
      limit 1
    `,
    [roomName, normalizedKey],
  );
  const match = result.rows[0];
  if (!match) {
    throw invalidPlayerCredentials();
  }

  return {
    room: { id: match.id, name: match.name },
    player: {
      id: match.playerId,
      displayName: match.displayName,
      seat: match.seat,
    },
  };
}

export async function getPlayerRoom(
  roomName: string,
  key: string | null,
): Promise<ActorProjection> {
  if (!key || !PLAYER_KEY_PATTERN.test(normalizePlayerKey(key))) {
    throw invalidPlayerCredentials();
  }

  return withTransaction(async (client) => {
    const room = await getRoomByName(client, roomName, "share");
    const player = await getPlayerByKey(client, room.id, key);
    const players = await getPlayersWithClient(client, room.id);
    const state = compatibleState(room, players);

    return makePlayerProjection(state, player.id, {
      roomId: room.id,
      roomName: room.name,
      roster: players.map((rosterPlayer) => ({
        id: rosterPlayer.id,
        displayName: rosterPlayer.displayName,
        seat: rosterPlayer.seat,
      })),
    });
  });
}

export async function applyPlayerRoomCommand(
  roomName: string,
  key: string | null,
  command: PlayerCommand,
): Promise<ActorProjection> {
  if (!key || !PLAYER_KEY_PATTERN.test(normalizePlayerKey(key))) {
    throw invalidPlayerCredentials();
  }

  return withTransaction(async (client) => {
    const room = await getRoomByName(client, roomName, "update");
    const player = await getPlayerByKey(client, room.id, key);
    const players = await getPlayersWithClient(client, room.id);
    const state = compatibleState(room, players);
    const nextState = runPlayerCommand(state, player.id, command);

    await client.query(
      `
        update private.rooms
        set state = $2::jsonb, updated_at = now()
        where id = $1
      `,
      [room.id, JSON.stringify(nextState)],
    );

    return makePlayerProjection(nextState, player.id, {
      roomId: room.id,
      roomName: room.name,
      roster: players.map((rosterPlayer) => ({
        id: rosterPlayer.id,
        displayName: rosterPlayer.displayName,
        seat: rosterPlayer.seat,
      })),
    });
  });
}

async function getRoomForUpdate(
  client: PoolClient,
  roomId: string,
): Promise<RoomRow> {
  const result = await client.query<RoomRow>(
    `
      select ${roomColumns}
      from private.rooms
      where id = $1
      for update
    `,
    [roomId],
  );
  const room = result.rows[0];
  if (!room) {
    throw new AppError("NOT_FOUND", "Room not found.", 404);
  }
  return room;
}

async function getRoomByName(
  client: PoolClient,
  roomName: string,
  lock: "share" | "update",
): Promise<RoomRow> {
  const result = await client.query<RoomRow>(
    `
      select ${roomColumns}
      from private.rooms
      where lower(name) = lower($1)
      ${lock === "update" ? "for update" : "for share"}
    `,
    [roomName],
  );
  const room = result.rows[0];
  if (!room) {
    throw new AppError("NOT_FOUND", "Room not found.", 404);
  }
  return room;
}

async function getPlayers(roomId: string): Promise<PlayerRow[]> {
  const result = await query<PlayerRow>(
    `
      select ${playerColumns}
      from private.room_players
      where room_id = $1
      order by seat
    `,
    [roomId],
  );
  return result.rows;
}

async function getPlayersWithClient(
  client: PoolClient,
  roomId: string,
): Promise<PlayerRow[]> {
  const result = await client.query<PlayerRow>(
    `
      select ${playerColumns}
      from private.room_players
      where room_id = $1
      order by seat
    `,
    [roomId],
  );
  return result.rows;
}

async function getPlayerByKey(
  client: PoolClient,
  roomId: string,
  key: string,
): Promise<PlayerRow> {
  const result = await client.query<PlayerRow>(
    `
      select ${playerColumns}
      from private.room_players
      where room_id = $1 and login_key = $2
    `,
    [roomId, normalizePlayerKey(key)],
  );
  const player = result.rows[0];
  if (!player) {
    throw invalidPlayerCredentials();
  }
  return player;
}

function compatibleState(
  room: RoomRow,
  roster: PlayerRow[],
): GameState {
  if (
    room.stateVersion !== CURRENT_STATE_VERSION ||
    !getMissionDefinition(room.editionKey, room.missionKey)
  ) {
    throw restartRequired();
  }

  const parsed = GameStateSchema.safeParse(room.state);
  if (
    !parsed.success ||
    parsed.data.stateVersion !== room.stateVersion ||
    !stateIsCoherent(parsed.data, room, roster)
  ) {
    throw restartRequired();
  }
  return parsed.data;
}

export function stateIsCoherent(
  state: GameState,
  room: RoomRow,
  roster: PlayerRow[],
): boolean {
  if (
    state.editionKey !== room.editionKey ||
    state.missionKey !== room.missionKey ||
    (state.phase === "finished") !== (state.result !== null) ||
    !stateMatchesMissionConfig(state)
  ) {
    return false;
  }

  if (state.phase === "setup") {
    return (
      state.seatOrder.length === 0 &&
      Object.keys(state.players).length === 0 &&
      state.captainPlayerId === null &&
      state.currentPlayerId === null &&
      state.tasks.length === 0 &&
      state.currentTrick === null &&
      state.lastTrick === null &&
      state.trickNumber === 0
    );
  }

  const rosterIds = roster.map((player) => player.id);
  const seatIds = state.seatOrder;
  if (
    rosterIds.length !== seatIds.length ||
    seatIds.length < 3 ||
    seatIds.length > 5 ||
    new Set(seatIds).size !== seatIds.length ||
    seatIds.some((playerId, index) => playerId !== rosterIds[index])
  ) {
    return false;
  }

  const playerEntries = Object.entries(state.players);
  if (
    playerEntries.length !== seatIds.length ||
    playerEntries.some(
      ([playerId, player]) =>
        !seatIds.includes(playerId) || player.playerId !== playerId,
    ) ||
    state.captainPlayerId === null ||
    !seatIds.includes(state.captainPlayerId) ||
    (state.currentPlayerId !== null &&
      !seatIds.includes(state.currentPlayerId)) ||
    state.tasks.some(
      (task) =>
        task.ownerPlayerId !== null &&
        !seatIds.includes(task.ownerPlayerId),
    ) ||
    new Set(state.tasks.map((task) => task.id)).size !== state.tasks.length
  ) {
    return false;
  }

  const trickPlayers = [
    ...(state.currentTrick?.plays.map((play) => play.playerId) ?? []),
    ...(state.lastTrick?.plays.map((play) => play.playerId) ?? []),
  ];
  if (trickPlayers.some((playerId) => !seatIds.includes(playerId))) {
    return false;
  }
  if (
    state.lastTrick &&
    (state.lastTrick.plays.length !== seatIds.length ||
      new Set(state.lastTrick.plays.map((play) => play.playerId)).size !==
        seatIds.length ||
      !seatIds.includes(state.lastTrick.leaderPlayerId) ||
      state.lastTrick.winnerPlayerId === null ||
      !seatIds.includes(state.lastTrick.winnerPlayerId))
  ) {
    return false;
  }

  const physicalCards = [
    ...playerEntries.flatMap(([, player]) => [
      ...player.hand,
      ...player.captured,
    ]),
    ...(state.currentTrick?.plays.map((play) => play.cardId) ?? []),
  ];
  if (
    physicalCards.length !== 40 ||
    new Set(physicalCards).size !== physicalCards.length
  ) {
    return false;
  }

  const completedCards = playerEntries.reduce(
    (total, [, player]) => total + player.captured.length,
    0,
  );
  if (
    completedCards !== state.trickNumber * seatIds.length ||
    playerEntries.some(
      ([, player]) =>
        player.captured.length !== player.tricksWon * seatIds.length,
    )
  ) {
    return false;
  }

  if (
    (state.trickNumber === 0 && state.lastTrick !== null) ||
    (state.trickNumber > 0 &&
      (state.lastTrick === null ||
        state.lastTrick.number !== state.trickNumber ||
        state.lastTrick.winnerPlayerId === null))
  ) {
    return false;
  }

  if (state.currentTrick) {
    if (
      (state.phase !== "playing-trick" && state.phase !== "finished") ||
      state.currentTrick.number !== state.trickNumber + 1 ||
      state.currentTrick.plays.length === 0 ||
      state.currentTrick.plays.length >= seatIds.length ||
      state.currentTrick.winnerPlayerId !== null ||
      !seatIds.includes(state.currentTrick.leaderPlayerId) ||
      new Set(
        state.currentTrick.plays.map((play) => play.playerId),
      ).size !== state.currentTrick.plays.length
    ) {
      return false;
    }
  } else if (state.phase === "playing-trick") {
    return false;
  }

  const phaseNeedsCurrentPlayer =
    state.phase === "assigning-tasks" ||
    state.phase === "between-tricks" ||
    state.phase === "playing-trick";
  return phaseNeedsCurrentPlayer
    ? state.currentPlayerId !== null
    : state.currentPlayerId === null;
}

export function stateMatchesMissionConfig(state: GameState): boolean {
  let mission: ReturnType<typeof getMission>;
  try {
    mission = getMission(state.editionKey, state.missionKey);
  } catch {
    return false;
  }

  if (state.phase === "setup") {
    return state.tasks.length === 0;
  }

  const playerCount = state.seatOrder.length;
  if (playerCount !== 3 && playerCount !== 4 && playerCount !== 5) {
    return false;
  }

  const assignedTaskCount = state.tasks.filter(
    (task) => task.ownerPlayerId !== null,
  ).length;
  const assignmentIsCoherent =
    state.phase === "assigning-tasks"
      ? state.tasks.length > 0 && assignedTaskCount < state.tasks.length
      : assignedTaskCount === state.tasks.length;
  if (!assignmentIsCoherent || state.assignmentTurns < assignedTaskCount) {
    return false;
  }

  if (mission.editionKey === "planet-nine") {
    if (
      state.tasks.length !== mission.taskCount ||
      state.assignmentTurns !== assignedTaskCount
    ) {
      return false;
    }

    const objectiveCards = state.tasks.map((task) => task.cardId);
    return (
      new Set(objectiveCards).size === objectiveCards.length &&
      state.tasks.every((task, index) => {
        const cardId = task.cardId;
        return (
          cardId !== null &&
          NON_TRUMP_CARD_IDS.includes(cardId) &&
          task.id === `planet-nine-task:${cardId}` &&
          task.definitionId === `planet-nine-card:${cardId}` &&
          task.difficulty === null &&
          task.order === (mission.orderTokens[index] ?? null)
        );
      })
    );
  }

  if (
    (state.tasks.length < playerCount &&
      state.assignmentTurns > playerCount) ||
    (state.tasks.length >= playerCount &&
      state.assignmentTurns !== assignedTaskCount)
  ) {
    return false;
  }

  let difficultyTotal = 0;
  try {
    for (const task of state.tasks) {
      const definition = getDeepSeaTask(task.definitionId);
      const difficulty = definition.difficulty[playerCount as PlayerCount];
      if (
        task.id !== definition.id ||
        task.definitionId !== definition.id ||
        task.cardId !== null ||
        task.order !== null ||
        task.difficulty !== difficulty
      ) {
        return false;
      }
      difficultyTotal += difficulty;
    }
  } catch {
    return false;
  }

  return (
    new Set(state.tasks.map((task) => task.id)).size === state.tasks.length &&
    difficultyTotal === mission.taskBudget &&
    (mission.taskBudget === 0
      ? state.tasks.length === 0
      : state.tasks.length > 0)
  );
}

function attemptNumber(room: RoomRow): number {
  const parsed = GameStateSchema.safeParse(room.state);
  return parsed.success ? parsed.data.attemptNumber : 1;
}

function resetStateForMutation(
  room: RoomRow,
  confirmReset: boolean,
): { attemptNumber: number } {
  const parsed = GameStateSchema.safeParse(room.state);
  const broken =
    room.stateVersion !== CURRENT_STATE_VERSION ||
    !parsed.success;
  const active =
    parsed.success &&
    parsed.data.phase !== "setup" &&
    parsed.data.phase !== "finished";
  const requiresReset =
    broken || (parsed.success && parsed.data.phase !== "setup");

  if ((broken || active) && !confirmReset) {
    throw new AppError(
      "RESET_CONFIRMATION_REQUIRED",
      "This change will restart the current level. Confirm the reset to continue.",
      409,
    );
  }

  return {
    attemptNumber:
      requiresReset && parsed.success
        ? parsed.data.attemptNumber + 1
        : parsed.success
          ? parsed.data.attemptNumber
          : 1,
  };
}

async function resetRoomForRosterMutation(
  client: PoolClient,
  room: RoomRow,
  confirmReset: boolean,
): Promise<void> {
  const reset = resetStateForMutation(room, confirmReset);
  const parsed = GameStateSchema.safeParse(room.state);
  const requiresReset =
    room.stateVersion !== CURRENT_STATE_VERSION ||
    !parsed.success ||
    parsed.data.phase !== "setup";

  if (!requiresReset) {
    return;
  }

  const state = makeSetupState(
    room.editionKey,
    room.missionKey,
    reset.attemptNumber,
  );
  await client.query(
    `
      update private.rooms
      set state_version = $2, state = $3::jsonb, updated_at = now()
      where id = $1
    `,
    [room.id, CURRENT_STATE_VERSION, JSON.stringify(state)],
  );
}

function requirePlayableRoster(players: PlayerRow[]): void {
  if (players.length < 3 || players.length > 5) {
    throw new AppError(
      "ROOM_NOT_READY",
      "Add between three and five players before starting.",
      409,
    );
  }
}

function firstAvailableSeat(players: PlayerRow[]): number {
  for (let seat = 1; seat <= 5; seat += 1) {
    if (!players.some((player) => player.seat === seat)) {
      return seat;
    }
  }
  throw new AppError("CONFLICT", "There are no available seats.", 409);
}

function uniquePlayerKey(players: PlayerRow[]): string {
  const keys = new Set(players.map((player) => player.loginKey));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const key = generatePlayerKey();
    if (!keys.has(key)) {
      return key;
    }
  }
  throw new AppError("SERVER_ERROR", "Could not generate a player key.", 500);
}

async function touchRoom(client: PoolClient, roomId: string): Promise<void> {
  await client.query(
    `update private.rooms set updated_at = now() where id = $1`,
    [roomId],
  );
}

async function compactPlayerSeats(
  client: PoolClient,
  roomId: string,
): Promise<void> {
  const players = await getPlayersWithClient(client, roomId);
  if (players.every((player, index) => player.seat === index + 1)) {
    return;
  }

  await client.query(
    "set constraints private.room_players_room_seat_key deferred",
  );
  for (const [index, player] of players.entries()) {
    await client.query(
      `
        update private.room_players
        set seat = $3
        where room_id = $1 and id = $2
      `,
      [roomId, player.id, index + 1],
    );
  }
}

function adminSummary(
  room: RoomRow,
  playerCount: number,
  roster?: PlayerRow[],
): AdminRoomSummary {
  const parsed = GameStateSchema.safeParse(room.state);
  const configuredMission = getMissionDefinition(
    room.editionKey,
    room.missionKey,
  );
  const missionDefinition = configuredMission ?? {
    number: 0,
    title: "Unknown mission",
  };
  const restartRequired =
    room.stateVersion !== CURRENT_STATE_VERSION ||
    !configuredMission ||
    !parsed.success ||
    parsed.data.stateVersion !== room.stateVersion ||
    (parsed.success && !stateMatchesMissionConfig(parsed.data)) ||
    (parsed.success &&
      roster !== undefined &&
      !stateIsCoherent(parsed.data, room, roster));

  return {
    id: room.id,
    name: room.name,
    editionKey: room.editionKey,
    missionKey: room.missionKey,
    missionNumber: missionDefinition.number,
    missionTitle: missionDefinition.title,
    stateVersion: room.stateVersion,
    phase: restartRequired ? "restart-required" : parsed.data.phase,
    result: restartRequired ? null : parsed.data.result,
    attemptNumber: parsed.success ? parsed.data.attemptNumber : 1,
    playerCount,
    restartRequired,
    createdAt: asIsoString(room.createdAt),
    updatedAt: asIsoString(room.updatedAt),
  };
}

function getMissionDefinition(
  editionKey: string,
  missionKey: string,
): { number: number; title: string } | null {
  const edition = adminEditionOptions().find(
    (candidate) => candidate.key === editionKey,
  );
  const mission = edition?.missions.find(
    (candidate) => candidate.key === missionKey,
  );
  if (!mission) {
    return null;
  }
  return mission;
}

function adminDetail(room: RoomRow, players: PlayerRow[]): AdminRoomDetail {
  return {
    ...adminSummary(room, players.length, players),
    players: players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      loginKey: player.loginKey,
      seat: player.seat,
      createdAt: asIsoString(player.createdAt),
    })),
  };
}

function asIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function invalidPlayerCredentials(): AppError {
  return new AppError(
    "INVALID_CREDENTIALS",
    "The room name or player key is incorrect.",
    401,
  );
}

function restartRequired(): AppError {
  return new AppError(
    "LEVEL_RESTART_REQUIRED",
    "This level was created by an incompatible game version. Ask an admin to restart it.",
    409,
  );
}
