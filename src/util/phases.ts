import { dealCardsAndGoals, endTrick } from "./state"
import { Agent, Condition, GoldenBorder, Move, OldPhase } from "./enums"

export const mapPhaseToDetails = {
    [OldPhase.Preflight]: {
        starting_agent: Agent.None,
        agent: Agent.All,
        moves: [Move.StartGame],
        end_condition: (state) => (state.started !== Condition.None),
        next_phase: () => OldPhase.Goal,
        on_end: dealCardsAndGoals,
    },

    [OldPhase.Goal]: {
        starting_agent: Agent.Commander,
        agent: Agent.Current,
        moves: [Move.ToggleGoal],
        end_condition: (state) => state.goals.every((goal) => goal.player !== undefined),
        next_phase: (state) => state.golden_border ? OldPhase.GoldenBorderDiscard : OldPhase.Communication,
    },

    [OldPhase.GoldenBorderDiscard]: {
        starting_agent: Agent.Commander,
        agent: Agent.Commander,
        moves: [Move.ToggleGoal, Move.SkipGoldenBorder],
        end_condition: (state) => state.golden_border === GoldenBorder.Used || state.golden_border === GoldenBorder.Skipped,
        next_phase: (state) => state.golden_border === GoldenBorder.Used ? OldPhase.GoldenBorderAccept : OldPhase.Communication,
    },

    [OldPhase.GoldenBorderAccept]: {
        starting_agent: Agent.All,
        agent: Agent.All,
        moves: [Move.ToggleGoal],
        end_condition: (state) => state.goals.every((goal) => goal.player !== undefined),
        next_phase: () => OldPhase.Communication
    },

    [OldPhase.Communication]: {
        starting_agent: Agent.Commander,
        agent: Agent.All,
        moves: [Move.CommunicateCard, Move.CommunicateValue, Move.StartTrick],
        end_condition: (state) => state.current_trick !== undefined,
        next_phase: () => OldPhase.StartTrick,
    },

    [OldPhase.StartTrick]: {
        moves: [Move.PlayCard],
        starting_agent: Agent.Winner,
        agent: Agent.Winner,
        end_condition: (state) => state.current_trick.suite !== undefined,
        next_phase: () => OldPhase.PlayTrick,
    },

    [OldPhase.PlayTrick]: {
        starting_agent: Agent.Next,
        moves: [Move.PlayCard],
        agent: Agent.Current,
        end_condition: (state) => {
            var played = true
            for (let i = 0; i < state.num_players; i++) {
                played = played && (state.current_trick[i].suite !== undefined)
            }
            return played
        },
        on_end: endTrick,
        next_phase: () => OldPhase.Communication,
    }
}