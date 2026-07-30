import {
  GameStateSchema,
  PlayerCommandSchema,
  type CardId,
  type GameState,
  type PlayerCommand,
  type TransitionResult,
} from "../contracts";
import { getMission } from "../config";
import { failure, success } from "./result";
import {
  determineTrickWinner,
  getCommunicationQualifiers,
  getPlayableCardIds,
  nextPlayerId,
} from "./rules";

function finishFromTaskOutcomes(state: GameState): boolean {
  if (state.tasks.some((task) => task.outcome === "failure")) {
    state.phase = "finished";
    state.result = "lost";
    state.currentPlayerId = null;
    return true;
  }
  if (
    state.tasks.length > 0 &&
    state.tasks.every((task) => task.outcome === "success")
  ) {
    state.phase = "finished";
    state.result = "won";
    state.currentPlayerId = null;
    return true;
  }
  return false;
}

function claimTask(
  state: GameState,
  actorPlayerId: string,
  taskId: string,
): TransitionResult {
  if (state.phase !== "assigning-tasks") {
    return failure("INVALID_PHASE", "Tasks can only be claimed during assignment.");
  }
  if (state.currentPlayerId !== actorPlayerId) {
    return failure("NOT_YOUR_TURN", "It is not your turn to claim a task.");
  }
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) {
    return failure("UNKNOWN_TASK", "That task does not exist in this attempt.");
  }
  if (task.ownerPlayerId) {
    return failure("TASK_ALREADY_CLAIMED", "That task has already been claimed.");
  }

  task.ownerPlayerId = actorPlayerId;
  state.assignmentTurns += 1;

  if (state.tasks.every((candidate) => candidate.ownerPlayerId !== null)) {
    state.phase = "between-tricks";
    state.currentPlayerId = state.captainPlayerId;
  } else {
    state.currentPlayerId = nextPlayerId(state.seatOrder, actorPlayerId);
  }
  return success(state);
}

function passTask(
  state: GameState,
  actorPlayerId: string,
): TransitionResult {
  if (state.phase !== "assigning-tasks") {
    return failure("INVALID_PHASE", "Tasks can only be passed during assignment.");
  }
  if (state.currentPlayerId !== actorPlayerId) {
    return failure("NOT_YOUR_TURN", "It is not your turn to pass.");
  }
  if (state.editionKey !== "deep-sea" || state.tasks.length >= state.seatOrder.length) {
    return failure(
      "PASS_NOT_ALLOWED",
      "Passing is only allowed when there are fewer Deep Sea tasks than players.",
    );
  }

  const unclaimedCount = state.tasks.filter(
    (task) => task.ownerPlayerId === null,
  ).length;
  const remainingTurnsAfterPass =
    state.seatOrder.length - (state.assignmentTurns + 1);
  if (
    state.assignmentTurns >= state.seatOrder.length ||
    unclaimedCount > remainingTurnsAfterPass
  ) {
    return failure(
      "PASS_NOT_ALLOWED",
      "A task must be claimed now so every task is assigned this round.",
    );
  }

  state.assignmentTurns += 1;
  state.currentPlayerId = nextPlayerId(state.seatOrder, actorPlayerId);
  return success(state);
}

function communicate(
  state: GameState,
  actorPlayerId: string,
  cardId: CardId,
  qualifier: "highest" | "only" | "lowest",
): TransitionResult {
  const mission = getMission(state.editionKey, state.missionKey);
  if (state.phase !== "between-tricks" || mission.deadSpot) {
    return failure(
      "COMMUNICATION_NOT_ALLOWED",
      mission.deadSpot
        ? "Communication is disabled for this mission."
        : "Communication is only allowed between tricks.",
    );
  }
  const player = state.players[actorPlayerId];
  if (player.hasCommunicated) {
    return failure(
      "COMMUNICATION_NOT_ALLOWED",
      "You have already communicated this attempt.",
    );
  }
  const validQualifiers = getCommunicationQualifiers(
    state,
    actorPlayerId,
    cardId,
  );
  if (!validQualifiers.includes(qualifier)) {
    return failure(
      "INVALID_COMMUNICATION",
      "That card and qualifier do not match your current hand.",
    );
  }

  player.hasCommunicated = true;
  player.communication = { cardId, qualifier };
  return success(state);
}

function playCard(
  state: GameState,
  actorPlayerId: string,
  cardId: CardId,
): TransitionResult {
  if (state.phase !== "between-tricks" && state.phase !== "playing-trick") {
    return failure("INVALID_PHASE", "Cards cannot be played in this phase.");
  }
  if (state.currentPlayerId !== actorPlayerId) {
    return failure("NOT_YOUR_TURN", "It is not your turn to play.");
  }
  const player = state.players[actorPlayerId];
  if (!player.hand.includes(cardId)) {
    return failure("INVALID_CARD", "That card is not in your hand.");
  }
  const playableCardIds = getPlayableCardIds(state, actorPlayerId);
  if (!playableCardIds.includes(cardId)) {
    return failure(
      "MUST_FOLLOW_SUIT",
      "You must follow the suit that led this trick.",
    );
  }

  if (!state.currentTrick) {
    state.currentTrick = {
      number: state.trickNumber + 1,
      leaderPlayerId: actorPlayerId,
      plays: [],
      winnerPlayerId: null,
    };
  }
  state.currentTrick.plays.push({ playerId: actorPlayerId, cardId });
  player.hand = player.hand.filter((candidate) => candidate !== cardId);

  if (state.currentTrick.plays.length < state.seatOrder.length) {
    state.phase = "playing-trick";
    state.currentPlayerId = nextPlayerId(state.seatOrder, actorPlayerId);
    return success(state);
  }

  const winnerPlayerId = determineTrickWinner(state.currentTrick);
  state.currentTrick.winnerPlayerId = winnerPlayerId;
  const winningPlayer = state.players[winnerPlayerId];
  winningPlayer.captured.push(
    ...state.currentTrick.plays.map((play) => play.cardId),
  );
  winningPlayer.tricksWon += 1;
  state.lastTrick = state.currentTrick;
  state.trickNumber = state.currentTrick.number;
  state.currentTrick = null;
  state.currentPlayerId = winnerPlayerId;

  if (finishFromTaskOutcomes(state)) {
    return success(state);
  }

  const canCompleteAnotherTrick = state.seatOrder.every(
    (playerId) => state.players[playerId].hand.length > 0,
  );
  if (!canCompleteAnotherTrick) {
    state.phase = "adjudicating";
    state.currentPlayerId = null;
  } else {
    state.phase = "between-tricks";
  }
  return success(state);
}

function setTaskOutcome(
  state: GameState,
  taskId: string,
  outcome: "pending" | "success" | "failure",
): TransitionResult {
  if (
    state.phase !== "between-tricks" &&
    state.phase !== "playing-trick" &&
    state.phase !== "adjudicating"
  ) {
    return failure(
      "OUTCOME_NOT_ALLOWED",
      "Task outcomes can only be set after assignment.",
    );
  }
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) {
    return failure("UNKNOWN_TASK", "That task does not exist in this attempt.");
  }

  task.outcome = outcome;
  finishFromTaskOutcomes(state);
  return success(state);
}

function setMissionOutcome(
  state: GameState,
  outcome: "success" | "failure",
): TransitionResult {
  const mission = getMission(state.editionKey, state.missionKey);
  if (
    !mission.allowsManualMissionOutcome ||
    (state.phase !== "between-tricks" &&
      state.phase !== "playing-trick" &&
      state.phase !== "adjudicating")
  ) {
    return failure(
      "OUTCOME_NOT_ALLOWED",
      "This mission is resolved through its assigned tasks.",
    );
  }
  state.phase = "finished";
  state.result = outcome === "success" ? "won" : "lost";
  state.currentPlayerId = null;
  return success(state);
}

export function applyPlayerCommand(
  storedState: GameState,
  actorPlayerId: string,
  rawCommand: PlayerCommand,
): TransitionResult {
  const stateResult = GameStateSchema.safeParse(storedState);
  if (!stateResult.success) {
    return failure("INVALID_STATE", "The stored game state is invalid.");
  }
  const commandResult = PlayerCommandSchema.safeParse(rawCommand);
  if (!commandResult.success) {
    return failure("INVALID_STATE", "The player command is invalid.");
  }

  const state = stateResult.data;
  if (!state.players[actorPlayerId]) {
    return failure("UNKNOWN_PLAYER", "That player is not part of this attempt.");
  }

  const command = commandResult.data;
  switch (command.type) {
    case "claim-task":
      return claimTask(state, actorPlayerId, command.taskId);
    case "pass-task":
      return passTask(state, actorPlayerId);
    case "communicate":
      return communicate(
        state,
        actorPlayerId,
        command.cardId,
        command.qualifier,
      );
    case "play-card":
      return playCard(state, actorPlayerId, command.cardId);
    case "set-task-outcome":
      return setTaskOutcome(state, command.taskId, command.outcome);
    case "set-mission-outcome":
      return setMissionOutcome(state, command.outcome);
  }
}
