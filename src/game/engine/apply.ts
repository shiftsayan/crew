import {
  GameStateSchema,
  EnginePlayerCommandSchema,
  type CardId,
  type EnginePlayerCommand,
  type GameState,
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

function claimTask(
  state: GameState,
  actorPlayerId: string,
  taskId: string,
): TransitionResult {
  if (state.phase !== "assigning-tasks") {
    return failure("INVALID_PHASE", "Tasks can only be claimed during assignment.");
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
    state.phase = "ready-to-start-trick";
    state.currentPlayerId = null;
  } else {
    state.currentPlayerId = state.captainPlayerId;
  }
  return success(state);
}

function releaseTask(
  state: GameState,
  actorPlayerId: string,
  taskId: string,
): TransitionResult {
  if (
    state.phase !== "assigning-tasks" &&
    state.phase !== "ready-to-start-trick"
  ) {
    return failure(
      "INVALID_PHASE",
      "Tasks can only be deselected during task selection.",
    );
  }
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) {
    return failure("UNKNOWN_TASK", "That task does not exist in this attempt.");
  }
  if (task.ownerPlayerId !== actorPlayerId) {
    return failure("TASK_NOT_OWNED", "You can only deselect your own task.");
  }
  if (state.assignmentTurns < 1) {
    return failure("INVALID_STATE", "The task assignment count is invalid.");
  }

  task.ownerPlayerId = null;
  state.assignmentTurns -= 1;
  state.phase = "assigning-tasks";
  state.currentPlayerId = state.captainPlayerId;
  return success(state);
}

function passTask(state: GameState): TransitionResult {
  if (state.phase !== "assigning-tasks") {
    return failure("INVALID_PHASE", "Tasks can only be passed during assignment.");
  }
  return failure(
    "PASS_NOT_ALLOWED",
    "Passing is not used during open task assignment.",
  );
}

function startTrick(state: GameState): TransitionResult {
  if (state.phase !== "ready-to-start-trick") {
    return failure(
      "INVALID_PHASE",
      "The first trick can only start after task assignment.",
    );
  }

  state.phase = "between-tricks";
  state.currentPlayerId = state.captainPlayerId;
  return success(state);
}

function beginTrick(
  state: GameState,
  actorPlayerId: string,
): TransitionResult {
  if (state.phase !== "between-tricks") {
    return failure(
      "INVALID_PHASE",
      "A trick can only begin during the between-tricks phase.",
    );
  }
  if (state.currentPlayerId !== actorPlayerId) {
    return failure("NOT_YOUR_TURN", "Only the next trick leader can begin it.");
  }
  if (state.currentTrick) {
    return failure("INVALID_STATE", "A trick is already in progress.");
  }

  state.currentTrick = {
    number: state.trickNumber + 1,
    leaderPlayerId: actorPlayerId,
    plays: [],
    winnerPlayerId: null,
  };
  state.phase = "playing-trick";
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
  return success(state);
}

function setMissionOutcome(
  state: GameState,
  actorPlayerId: string,
  outcome: "success" | "failure",
): TransitionResult {
  const mission = getMission(state.editionKey, state.missionKey);
  if (state.captainPlayerId !== actorPlayerId) {
    return failure(
      "OUTCOME_NOT_ALLOWED",
      "Only the commander can record the mission result.",
    );
  }
  if (state.phase !== "between-tricks" && state.phase !== "adjudicating") {
    return failure(
      "OUTCOME_NOT_ALLOWED",
      "The mission result can only be recorded between tricks.",
    );
  }

  const allTaskStatusesSet =
    state.tasks.length > 0 &&
    state.tasks.every((task) => task.outcome !== "pending");
  const tasklessManualMission =
    state.tasks.length === 0 && mission.allowsManualMissionOutcome;
  if (!allTaskStatusesSet && !tasklessManualMission) {
    return failure(
      "OUTCOME_NOT_ALLOWED",
      "Set every task status before recording the mission result.",
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
  rawCommand: EnginePlayerCommand,
): TransitionResult {
  const stateResult = GameStateSchema.safeParse(storedState);
  if (!stateResult.success) {
    return failure("INVALID_STATE", "The stored game state is invalid.");
  }
  const commandResult = EnginePlayerCommandSchema.safeParse(rawCommand);
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
    case "release-task":
      return releaseTask(state, actorPlayerId, command.taskId);
    case "pass-task":
      return passTask(state);
    case "start-trick":
      return startTrick(state);
    case "begin-trick":
      return beginTrick(state, actorPlayerId);
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
      return setMissionOutcome(state, actorPlayerId, command.outcome);
  }
}
