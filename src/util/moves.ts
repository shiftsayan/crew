import { Agent, Condition, GoldenBorder, Move } from "./enums";
import { mapPhaseToDetails } from "./phases";
import {
  advancePhase,
  communicateCard,
  communicateValue,
  playCard,
  startTrick,
  toggleGoal,
} from "./state";

export function performMove(state, setState, move, data) {
  var phase_details = mapPhaseToDetails[state.phase];

  // Check if move is allowed in current phase
  if (!phase_details.moves.includes(move)) {
    console.error("Move not allowed in this phase.");
    return;
  }

  // Check if this player is allowed to make this move
  var valid_agent = check_agency(state);
  if (!valid_agent) {
    console.error("Move not allowed by this player.");
    return;
  }

  // Perform actual move
  var move_updates: any = {};
  try {
    switch (move) {
      case Move.StartGame:
        move_updates = { condition: Condition.InProgress };
        break;
      case Move.ToggleGoal:
        move_updates = toggleGoal(data.goal_idx, state);
        break;
      case Move.SkipGoldenBorder:
        move_updates = { golden_border: GoldenBorder.Skipped };
        break;
      case Move.StartTrick:
        move_updates = startTrick(state);
        break;
      case Move.PlayCard:
        move_updates = playCard(data.card, state);
        break;
      case Move.CommunicateCard:
        move_updates = communicateCard(data.card, state);
        break;
      case Move.CommunicateValue:
        move_updates = communicateValue(data.value, state);
        break;
      default:
        throw new Error("Move not found.");
    }
  } catch (error) {
    console.error(error);
    return;
  }

  // Update current player
  switch (phase_details.agent) {
    case Agent.Current:
    case Agent.Next:
      move_updates.current_player =
        (state.current_player + 1) % state.num_players;
      move_updates.this_player = (state.this_player + 1) % state.num_players;
      break;
  }

  // Check end condition
  var advance_phase_updates = {};
  if (phase_details.end_condition) {
    if (phase_details.end_condition({ ...state, ...move_updates })) {
      advance_phase_updates = advancePhase({ ...state, ...move_updates });
    }
  }

  setState({
    ...state,
    ...move_updates,
    ...advance_phase_updates,
  });
}

export function check_agency(state) {
  var phase_details = mapPhaseToDetails[state.phase];

  var valid_agent = false;
  switch (phase_details.agent) {
    case Agent.None:
      break;
    case Agent.All:
      valid_agent = true;
      break;
    case Agent.Current:
      valid_agent = state.this_player === state.current_player || true; // TODO
      break;
    case Agent.Next:
      valid_agent =
        state.this_player === (state.current_player + 1) % state.num_players;
      break;
    case Agent.Winner:
      if (state.last_winner !== undefined)
        valid_agent = state.this_player === state.last_winner;
      else valid_agent = state.this_player === state.commander;
      break;
    case Agent.Commander:
      valid_agent = state.this_player === state.commander;
      break;
  }

  return valid_agent;
}
