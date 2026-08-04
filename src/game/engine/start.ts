import {
  GameStateSchema,
  type CardId,
  type EngineTask,
  type GameState,
  type PlayerCount,
  type TransitionResult,
} from "../contracts";
import {
  CARD_IDS,
  DEEP_SEA_TASKS,
  NON_TRUMP_CARD_IDS,
  compareCardsForHand,
  getDeepSeaTask,
  getMission,
} from "../config";
import { failure, success } from "./result";

export type StartAttemptInput = {
  playerIds: string[];
  deckOrder: CardId[];
  taskOrder: string[];
};

function hasExactlyValues<T>(received: readonly T[], expected: readonly T[]) {
  return (
    received.length === expected.length &&
    new Set(received).size === expected.length &&
    expected.every((value) => received.includes(value))
  );
}

function selectDeepSeaTasks(
  orderedTaskIds: readonly string[],
  budget: number,
  playerCount: PlayerCount,
): EngineTask[] | null {
  const orderedTasks = orderedTaskIds.map(getDeepSeaTask);
  const chosen: EngineTask[] = [];

  function visit(index: number, remaining: number): boolean {
    if (remaining === 0) {
      return true;
    }
    if (index >= orderedTasks.length || remaining < 0) {
      return false;
    }

    for (let candidateIndex = index; candidateIndex < orderedTasks.length; candidateIndex += 1) {
      const task = orderedTasks[candidateIndex];
      const difficulty = task.difficulty[playerCount];
      if (difficulty > remaining) {
        continue;
      }
      chosen.push({
        id: task.id,
        definitionId: task.id,
        difficulty,
        cardId: null,
        order: null,
        ownerPlayerId: null,
        outcome: "pending",
      });
      if (visit(candidateIndex + 1, remaining - difficulty)) {
        return true;
      }
      chosen.pop();
    }
    return false;
  }

  return visit(0, budget) ? chosen : null;
}

export function startAttempt(
  preflightState: GameState,
  input: StartAttemptInput,
): TransitionResult {
  const parsed = GameStateSchema.safeParse(preflightState);
  if (!parsed.success) {
    return failure("INVALID_STATE", "The stored game state is invalid.");
  }
  const state = parsed.data;
  if (state.phase !== "preflight") {
    return failure("INVALID_PHASE", "Only a preflight room can start an attempt.");
  }

  const playerCount = input.playerIds.length;
  if (
    playerCount < 3 ||
    playerCount > 5 ||
    new Set(input.playerIds).size !== playerCount ||
    input.playerIds.some((playerId) => playerId.length === 0)
  ) {
    return failure(
      "INVALID_PREFLIGHT",
      "An attempt requires three to five distinct players in seat order.",
    );
  }
  if (!hasExactlyValues(input.deckOrder, CARD_IDS)) {
    return failure(
      "INVALID_PREFLIGHT",
      "Deck order must contain each of the 40 cards exactly once.",
    );
  }

  const players = Object.fromEntries(
    input.playerIds.map((playerId) => [
      playerId,
      {
        playerId,
        hand: [] as CardId[],
        captured: [] as CardId[],
        tricksWon: 0,
        hasCommunicated: false,
        communication: null,
      },
    ]),
  );

  input.deckOrder.forEach((cardId, index) => {
    players[input.playerIds[index % playerCount]].hand.push(cardId);
  });
  Object.values(players).forEach((player) =>
    player.hand.sort(compareCardsForHand),
  );

  const captainPlayerId = input.playerIds.find((playerId) =>
    players[playerId].hand.includes("trump-4"),
  );
  if (!captainPlayerId) {
    return failure("INVALID_PREFLIGHT", "The dealt deck has no captain.");
  }

  const mission = getMission(state.editionKey, state.missionKey);
  let tasks: EngineTask[];

  try {
    if (mission.editionKey === "planet-nine") {
      if (!hasExactlyValues(input.taskOrder as CardId[], NON_TRUMP_CARD_IDS)) {
        return failure(
          "INVALID_PREFLIGHT",
          "Planet Nine task order must contain every non-trump card exactly once.",
        );
      }
      tasks = (input.taskOrder as CardId[])
        .slice(0, mission.taskCount)
        .map((cardId, index) => ({
            id: `planet-nine-task:${cardId}`,
            definitionId: `planet-nine-card:${cardId}`,
            difficulty: null,
            cardId,
            order: mission.orderTokens[index] ?? null,
            ownerPlayerId: null,
            outcome: "pending",
          }));
    } else {
      const expectedTaskIds = DEEP_SEA_TASKS.map((task) => task.id);
      if (!hasExactlyValues(input.taskOrder, expectedTaskIds)) {
        return failure(
          "INVALID_PREFLIGHT",
          "Deep Sea task order must contain each task from 1 through 96 exactly once.",
        );
      }
      tasks =
        selectDeepSeaTasks(
          input.taskOrder,
          mission.taskBudget,
          playerCount as PlayerCount,
        ) ?? [];
      if (mission.taskBudget > 0 && tasks.length === 0) {
        return failure(
          "INVALID_PREFLIGHT",
          `No task combination matches difficulty ${mission.taskBudget}.`,
        );
      }
    }
  } catch {
    return failure("INVALID_PREFLIGHT", "Task order contains an unknown task.");
  }

  const nextState: GameState = {
    ...state,
    phase: tasks.length > 0 ? "assigning-tasks" : "between-tricks",
    result: null,
    seatOrder: [...input.playerIds],
    captainPlayerId,
    currentPlayerId: captainPlayerId,
    players,
    tasks,
    assignmentTurns: 0,
    currentTrick: null,
    lastTrick: null,
    trickNumber: 0,
  };

  const validated = GameStateSchema.safeParse(nextState);
  return validated.success
    ? success(validated.data)
    : failure("INVALID_STATE", "Attempt start produced invalid state.");
}
