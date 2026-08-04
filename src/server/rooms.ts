import "server-only";

import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";

import {
  NON_TRUMP_CARD_IDS,
  getDeepSeaTask,
  getMission,
  type PlayerCount,
  type PlayerCommand,
} from "@/game";
import {
  type AddPlayerInput,
  type AdminRoomAction,
  type AdminRoomDetail,
  type AdminRoomSummary,
  type CreateRoomInput,
  DisplayNameSchema,
  type PlayerRow,
  RoomNameSchema,
  type RoomRow,
  type SaveAdminRoomSettingsInput,
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
  makePreflightState,
  nextMissionFor,
  runPlayerCommand,
  type ActorProjection,
  type GameState,
} from "@/server/game-runtime";
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
  tags,
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
  const state = makePreflightState(mission.editionKey, mission.missionKey);

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
      state = makePreflightState(
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

export async function saveAdminRoomSettings(
  roomId: string,
  input: SaveAdminRoomSettingsInput,
): Promise<AdminRoomDetail> {
  await withTransaction(async (client) => {
    const room = await getRoomForUpdate(client, roomId);
    const currentPlayers = await getPlayersWithClient(client, roomId);
    const currentPlayersById = new Map(
      currentPlayers.map((player) => [player.id, player]),
    );
    const desiredPlayers = input.players.filter(
      (player) => player.displayName.length > 0,
    );

    for (const player of desiredPlayers) {
      if (player.id && !currentPlayersById.has(player.id)) {
        throw new AppError(
          "NOT_FOUND",
          "A player in these settings no longer exists.",
          404,
        );
      }
    }

    const mission = assertMission(input.editionKey, input.missionKey);
    const gameChanged =
      mission.editionKey !== room.editionKey ||
      mission.missionKey !== room.missionKey;
    const rosterChanged = hasRosterChanged(currentPlayers, desiredPlayers);
    const parsedState = GameStateSchema.safeParse(room.state);
    const attemptChanged =
      input.attemptNumber !== undefined &&
      input.attemptNumber !== attemptNumber(room);
    const attemptRequiresReset =
      attemptChanged &&
      (room.stateVersion !== CURRENT_STATE_VERSION ||
        !parsedState.success ||
        parsedState.data.stateVersion !== room.stateVersion ||
        !stateIsCoherent(parsedState.data, room, currentPlayers));
    const reset =
      gameChanged || rosterChanged || attemptRequiresReset
        ? resetStateForMutation(room, input.confirmReset)
        : null;
    const desiredIds = new Set(
      desiredPlayers.flatMap((player) => (player.id ? [player.id] : [])),
    );

    await client.query(
      "set constraints private.room_players_room_seat_key deferred",
    );

    for (const player of currentPlayers) {
      if (!desiredIds.has(player.id)) {
        await client.query(
          `delete from private.room_players where room_id = $1 and id = $2`,
          [roomId, player.id],
        );
      }
    }

    const reservedNames = new Set(
      desiredPlayers.map((player) =>
        player.displayName.toLocaleLowerCase("en-US"),
      ),
    );
    for (const player of desiredPlayers) {
      if (!player.id) continue;
      const temporaryName = temporaryPlayerName(player.id, reservedNames);
      reservedNames.add(temporaryName.toLocaleLowerCase("en-US"));
      await client.query(
        `
          update private.room_players
          set display_name = $3
          where room_id = $1 and id = $2
        `,
        [roomId, player.id, temporaryName],
      );
    }

    for (const player of desiredPlayers) {
      if (player.id) {
        await client.query(
          `
            update private.room_players
            set display_name = $3, tags = $4, seat = $5
            where room_id = $1 and id = $2
          `,
          [
            roomId,
            player.id,
            player.displayName,
            player.tags,
            player.seat,
          ],
        );
      } else {
        await client.query(
          `
            insert into private.room_players (
              room_id,
              display_name,
              tags,
              seat
            )
            values ($1, $2, $3, $4)
          `,
          [
            roomId,
            player.displayName,
            player.tags,
            player.seat,
          ],
        );
      }
    }

    let state = room.state;
    let stateVersion = room.stateVersion;
    if (reset) {
      state = makePreflightState(
        mission.editionKey,
        mission.missionKey,
        attemptChanged && input.attemptNumber !== undefined
          ? input.attemptNumber
          : reset.attemptNumber,
      );
      stateVersion = CURRENT_STATE_VERSION;
    } else if (
      attemptChanged &&
      input.attemptNumber !== undefined &&
      parsedState.success
    ) {
      state = {
        ...parsedState.data,
        attemptNumber: input.attemptNumber,
      };
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
    if (players.some((player) => player.seat === seat)) {
      throw new AppError("CONFLICT", "That seat is already occupied.", 409);
    }

    await client.query(
      `
        insert into private.room_players (
          room_id,
          display_name,
          tags,
          seat
        )
        values ($1, $2, $3, $4)
      `,
      [roomId, input.displayName, input.tags, seat],
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
    const rosterChanged =
      input.displayName !== undefined || input.seat !== undefined;
    if (rosterChanged) {
      await resetRoomForRosterMutation(client, room, input.confirmReset);
    }
    const players = await getPlayersWithClient(client, roomId);
    const player = players.find((candidate) => candidate.id === playerId);
    if (!player) {
      throw new AppError("NOT_FOUND", "Player not found.", 404);
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
          tags = $4,
          seat = $5
        where room_id = $1 and id = $2
      `,
      [
        roomId,
        playerId,
        input.displayName ?? player.displayName,
        input.tags ?? player.tags,
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
    await touchRoom(client, roomId);
  });

  return getAdminRoom(roomId);
}

export async function runAdminRoomAction(
  roomId: string,
  action: AdminRoomAction,
  confirmReset = false,
): Promise<AdminRoomDetail> {
  await withTransaction(async (client) => {
    const room = await getRoomForUpdate(client, roomId);
    const players = await getPlayersWithClient(client, roomId);

    if (action === "shuffle") {
      if (players.length < 2) {
        throw new AppError(
          "ROOM_NOT_READY",
          "Add at least two players before shuffling.",
          409,
        );
      }
      await resetRoomForRosterMutation(client, room, confirmReset);
      await shufflePlayerSeats(client, roomId, players);
      await touchRoom(client, roomId);
      return;
    }

    let editionKey = room.editionKey;
    let missionKey = room.missionKey;

    let currentAttempt = attemptNumber(room);
    if (action === "advance") {
      requirePlayableRoster(players);
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

    const state = makePreflightState(
      editionKey,
      missionKey,
      currentAttempt + 1,
    );

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
  playerName: string,
): Promise<{
  room: { id: string; name: string };
  player: { id: string; displayName: string; seat: number };
}> {
  const parsedRoomName = RoomNameSchema.safeParse(roomName);
  const parsedPlayerName = DisplayNameSchema.safeParse(playerName);
  if (!parsedRoomName.success || !parsedPlayerName.success) {
    throw invalidPlayerCredentials();
  }

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
        and lower(players.display_name) = lower($2)
      limit 1
    `,
    [parsedRoomName.data, parsedPlayerName.data],
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
  playerName: string | null,
): Promise<ActorProjection> {
  const parsedRoomName = RoomNameSchema.safeParse(roomName);
  const parsedPlayerName = DisplayNameSchema.safeParse(playerName);
  if (!parsedRoomName.success || !parsedPlayerName.success) {
    throw invalidPlayerCredentials();
  }

  return withTransaction(async (client) => {
    const room = await getRoomByName(client, parsedRoomName.data, "share");
    const player = await getPlayerByName(
      client,
      room.id,
      parsedPlayerName.data,
    );
    const players = await getPlayersWithClient(client, room.id);
    const state = compatibleState(room, players);

    return makePlayerProjection(state, player.id, {
      roomId: room.id,
      roomName: room.name,
      roster: players.map((rosterPlayer) => ({
        id: rosterPlayer.id,
        displayName: rosterPlayer.displayName,
        tags: rosterPlayer.tags,
        seat: rosterPlayer.seat,
      })),
    });
  });
}

export async function applyPlayerRoomCommand(
  roomName: string,
  playerName: string | null,
  command: PlayerCommand,
): Promise<ActorProjection> {
  const parsedRoomName = RoomNameSchema.safeParse(roomName);
  const parsedPlayerName = DisplayNameSchema.safeParse(playerName);
  if (!parsedRoomName.success || !parsedPlayerName.success) {
    throw invalidPlayerCredentials();
  }

  return withTransaction(async (client) => {
    const room = await getRoomByName(client, parsedRoomName.data, "update");
    const player = await getPlayerByName(
      client,
      room.id,
      parsedPlayerName.data,
    );
    const players = await getPlayersWithClient(client, room.id);
    const state = compatibleState(room, players);
    let nextState: GameState;
    if (command.type === "start-mission") {
      if (state.phase !== "preflight") {
        throw new AppError(
          "CONFLICT",
          "This mission has already started.",
          409,
        );
      }
      requirePlayableRoster(players);
      nextState = beginAttempt(state, players.map((roomPlayer) => roomPlayer.id));
    } else {
      nextState = runPlayerCommand(state, player.id, command);
    }

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
        tags: rosterPlayer.tags,
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
    throw invalidPlayerCredentials();
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

async function getPlayerByName(
  client: PoolClient,
  roomId: string,
  playerName: string,
): Promise<PlayerRow> {
  const result = await client.query<PlayerRow>(
    `
      select ${playerColumns}
      from private.room_players
      where room_id = $1 and lower(display_name) = lower($2)
    `,
    [roomId, playerName],
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

  if (state.phase === "preflight") {
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
    const expectedLeaderPlayerId =
      state.trickNumber === 0
        ? state.captainPlayerId
        : state.lastTrick?.winnerPlayerId;
    if (
      (state.phase !== "playing-trick" && state.phase !== "finished") ||
      state.currentTrick.number !== state.trickNumber + 1 ||
      state.currentTrick.plays.length >= seatIds.length ||
      state.currentTrick.winnerPlayerId !== null ||
      !seatIds.includes(state.currentTrick.leaderPlayerId) ||
      state.currentTrick.leaderPlayerId !== expectedLeaderPlayerId ||
      (state.currentTrick.plays[0]?.playerId ??
        state.currentTrick.leaderPlayerId) !==
        state.currentTrick.leaderPlayerId ||
      new Set(
        state.currentTrick.plays.map((play) => play.playerId),
      ).size !== state.currentTrick.plays.length
    ) {
      return false;
    }
    if (
      state.currentTrick.plays.length === 0 &&
      state.currentPlayerId !== state.currentTrick.leaderPlayerId
    ) {
      return false;
    }
  } else if (state.phase === "playing-trick") {
    return false;
  }

  const isPreparingFirstTrick =
    state.phase === "assigning-tasks" ||
    state.phase === "ready-to-start-trick";
  if (
    isPreparingFirstTrick &&
    (state.currentTrick !== null ||
      state.lastTrick !== null ||
      state.trickNumber !== 0 ||
      state.tasks.some((task) => task.outcome !== "pending") ||
      playerEntries.some(
        ([, player]) =>
          player.hasCommunicated || player.communication !== null,
      ))
  ) {
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

  if (state.phase === "preflight") {
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
      : state.phase === "ready-to-start-trick"
        ? state.tasks.length > 0 && assignedTaskCount === state.tasks.length
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

    const taskCardIds = state.tasks.map((task) => task.cardId);
    return (
      new Set(taskCardIds).size === taskCardIds.length &&
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
    parsed.data.phase !== "preflight" &&
    parsed.data.phase !== "finished";
  const requiresReset =
    broken || (parsed.success && parsed.data.phase !== "preflight");

  if ((broken || active) && !confirmReset) {
    throw new AppError(
      "RESET_CONFIRMATION_REQUIRED",
      "This change will discard the current attempt and return the room to preflight. Confirm the reset to continue.",
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
    parsed.data.phase !== "preflight";

  if (!requiresReset) {
    return;
  }

  const state = makePreflightState(
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

function hasRosterChanged(
  currentPlayers: PlayerRow[],
  desiredPlayers: SaveAdminRoomSettingsInput["players"],
): boolean {
  if (currentPlayers.length !== desiredPlayers.length) return true;
  const currentPlayersById = new Map(
    currentPlayers.map((player) => [player.id, player]),
  );

  return desiredPlayers.some((player) => {
    if (!player.id) return true;
    const current = currentPlayersById.get(player.id);
    return (
      !current ||
      current.displayName !== player.displayName ||
      current.seat !== player.seat
    );
  });
}

function temporaryPlayerName(playerId: string, reservedNames: Set<string>) {
  const token = playerId.replaceAll("-", "").slice(0, 20);
  let suffix = 0;
  let candidate = `tmp_${token}`;
  while (reservedNames.has(candidate.toLocaleLowerCase("en-US"))) {
    suffix += 1;
    candidate = `tmp_${token}_${suffix}`.slice(0, 32);
  }
  return candidate;
}

async function touchRoom(client: PoolClient, roomId: string): Promise<void> {
  await client.query(
    `update private.rooms set updated_at = now() where id = $1`,
    [roomId],
  );
}

async function shufflePlayerSeats(
  client: PoolClient,
  roomId: string,
  players: PlayerRow[],
): Promise<void> {
  const shuffledPlayers = [...players];
  for (let index = shuffledPlayers.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffledPlayers[index], shuffledPlayers[swapIndex]] = [
      shuffledPlayers[swapIndex],
      shuffledPlayers[index],
    ];
  }
  if (
    shuffledPlayers.every(
      (player, index) => player.id === players[index]?.id,
    )
  ) {
    shuffledPlayers.push(shuffledPlayers.shift()!);
  }

  await client.query(
    "set constraints private.room_players_room_seat_key deferred",
  );
  const occupiedSeats = players.map((player) => player.seat);
  for (const [index, player] of shuffledPlayers.entries()) {
    const seat = occupiedSeats[index];
    await client.query(
      `
        update private.room_players
        set seat = $3
        where room_id = $1 and id = $2
      `,
      [roomId, player.id, seat],
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
      tags: player.tags,
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
    "The room name or player name is incorrect.",
    401,
  );
}

function restartRequired(): AppError {
  return new AppError(
    "LEVEL_RESTART_REQUIRED",
    "This level was created by an incompatible game version. Ask an admin to return it to preflight.",
    409,
  );
}
