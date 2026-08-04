import {
  ActorProjectionSchema,
  type ActorProjection,
  type CardId,
  type EngineTask,
  type ProjectionContext,
  type GameState,
} from "../contracts";
import { getCard, getDeepSeaTask, getMission } from "../config";
import { getCommunicationQualifiers, getPlayableCardIds } from "./rules";

const OUTCOME_PHASES = new Set([
  "between-tricks",
  "playing-trick",
  "adjudicating",
]);

export function projectForPlayer(
  state: GameState,
  actorPlayerId: string,
  context: ProjectionContext,
): ActorProjection {
  const mission = getMission(state.editionKey, state.missionKey);
  const rosterById = new Map(context.roster.map((player) => [player.id, player]));
  const actorRoster = rosterById.get(actorPlayerId);
  if (!actorRoster) {
    throw new Error("The actor is not in this room's roster.");
  }

  const actorState = state.players[actorPlayerId] ?? {
    playerId: actorPlayerId,
    hand: [] as CardId[],
    captured: [] as CardId[],
    tricksWon: 0,
    hasCommunicated: false,
    communication: null,
  };
  const unclaimedTaskIds = state.tasks
    .filter((task) => task.ownerPlayerId === null)
    .map((task) => task.id);
  const isAssigningTasks = state.phase === "assigning-tasks";
  const isSelectingTasks =
    isAssigningTasks || state.phase === "ready-to-start-trick";
  const canResolveOutcomes = OUTCOME_PHASES.has(state.phase);
  const isCommander = state.captainPlayerId === actorPlayerId;
  const canRecordTaskedMissionOutcome =
    state.tasks.length > 0 &&
    state.tasks.every((task) => task.outcome !== "pending");
  const canRecordTasklessMissionOutcome =
    state.tasks.length === 0 && mission.allowsManualMissionOutcome;
  const isMissionOutcomePhase =
    state.phase === "between-tricks" || state.phase === "adjudicating";

  const projection: ActorProjection = {
    room: {
      id: context.roomId,
      name: context.roomName,
    },
    mission: {
      editionKey: state.editionKey,
      missionKey: state.missionKey,
      number: mission.number,
      title: mission.title,
      attemptNumber: state.attemptNumber,
      manualRule: mission.manualRule,
      deadSpot: mission.deadSpot,
    },
    phase: state.phase,
    result: state.result,
    self: {
      id: actorPlayerId,
      displayName: actorRoster.displayName,
      tags: actorRoster.tags,
      seat: actorRoster.seat,
      hand: actorState.hand.map(getCard),
      captured: actorState.captured.map(getCard),
      tricksWon: actorState.tricksWon,
      communication: actorState.communication,
    },
    players: [...context.roster]
      .sort((left, right) => left.seat - right.seat)
      .map((rosterPlayer) => {
        const player = state.players[rosterPlayer.id];
        return {
          id: rosterPlayer.id,
          displayName: rosterPlayer.displayName,
          tags: rosterPlayer.tags,
          seat: rosterPlayer.seat,
          cardCount: player?.hand.length ?? 0,
          tricksWon: player?.tricksWon ?? 0,
          communication: player?.communication ?? null,
          isCaptain: state.captainPlayerId === rosterPlayer.id,
          isCurrent:
            !isAssigningTasks && state.currentPlayerId === rosterPlayer.id,
        };
      }),
    tasks: state.tasks.map((task) => ({
      ...task,
      ...taskPresentation(state.editionKey, task),
      ownerDisplayName: task.ownerPlayerId
        ? (rosterById.get(task.ownerPlayerId)?.displayName ?? "Unknown player")
        : null,
    })),
    currentTrick: state.currentTrick,
    lastTrick: state.lastTrick,
    legalActions: {
      canStartMission:
        state.phase === "preflight" &&
        context.roster.length >= 3 &&
        context.roster.length <= 5,
      canStartTrick:
        state.phase === "ready-to-start-trick" ||
        (state.phase === "between-tricks" &&
          state.currentPlayerId === actorPlayerId &&
          actorState.hand.length > 0),
      claimableTaskIds: isAssigningTasks ? unclaimedTaskIds : [],
      releasableTaskIds: isSelectingTasks
        ? state.tasks
            .filter((task) => task.ownerPlayerId === actorPlayerId)
            .map((task) => task.id)
        : [],
      canPassTask: false,
      playableCardIds: getPlayableCardIds(state, actorPlayerId),
      communicationOptions:
        state.phase === "between-tricks" &&
        !mission.deadSpot &&
        !actorState.hasCommunicated
          ? actorState.hand.flatMap((cardId) => {
              const qualifiers = getCommunicationQualifiers(
                state,
                actorPlayerId,
                cardId,
              );
              return qualifiers.length > 0 ? [{ cardId, qualifiers }] : [];
            })
          : [],
      taskOutcomeTaskIds: canResolveOutcomes
        ? state.tasks.map((task) => task.id)
        : [],
      canSetMissionOutcome:
        isCommander &&
        isMissionOutcomePhase &&
        (canRecordTaskedMissionOutcome || canRecordTasklessMissionOutcome),
    },
  };

  return ActorProjectionSchema.parse(projection);
}

function taskPresentation(
  editionKey: GameState["editionKey"],
  task: EngineTask,
): { title: string; footnote: string | null } {
  if (editionKey === "deep-sea") {
    const definition = getDeepSeaTask(task.definitionId);
    return {
      title: definition.presentation.summary,
      footnote: definition.presentation.footnote ?? null,
    };
  }

  if (!task.cardId) {
    throw new Error(`Planet Nine task ${task.id} has no task card.`);
  }
  const card = getCard(task.cardId);
  return {
    title: `Capture the ${card.suit} ${card.value}`,
    footnote: null,
  };
}
