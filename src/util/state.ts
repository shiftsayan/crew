import {
  Agent,
  Communication,
  Condition,
  GoldenBorder,
  OldPhase,
} from "./enums";
import { mapPhaseToDetails } from "./phases";
import { shuffle } from "./random";

export function dealCardsAndGoals(state) {
  var cards = shuffle([...state.cards]);

  var player = 0;
  var commander = undefined;

  while (cards.length !== 0) {
    var card = cards.pop();
    if (card.suite === state.trump_suit && card.num === 4) {
      commander = player;
      commander = state.this_player; // TODO
    }
    state.players[player].hand.push(card);
    player = (player + 1) % state.num_players;
  }

  var goals = shuffle([...state.cards]);

  var i = 0;
  while (i !== state.num_goals) {
    var goal = goals.pop();
    if (goal.suite !== state.trump_suit) {
      state.goals.push({
        ...goal,
        order: state.orders[i],
        accomplished: undefined,
      });
      i++;
    }
  }

  return {
    commander: commander,
  };
}

export function playCard(card, state) {
  // Only allow playing cards you have
  if (!state.players[state.this_player].hand.includes(card)) {
    throw new Error("Card not possessed.");
  }
  if (
    state.current_trick.suite && // If trick has already been started
    card.suite !== state.current_trick.suite && // and card's suite does not match trick suite
    !state.players[state.this_player].hand.every(
      (_card) => _card.suite !== state.current_trick.suite // then the player must not have a card of the trick suite.
    )
  ) {
    throw new Error("Must play card of trick suite when possible");
  }

  // Remove card from hand
  var new_hand = state.players[state.this_player].hand.filter(
    (_card) => !(_card.num === card.num && _card.suite === card.suite)
  );

  // Add card to played cards
  state.played_cards.push(card);

  return {
    players: {
      ...state.players,
      [state.this_player]: {
        ...state.players[state.this_player],
        hand: new_hand,
      },
    },
    current_trick: {
      ...state.current_trick,
      [state.this_player]: card,
      suite: state.current_trick.suite || card.suite,
    },
  };
}

export function communicateCard(card, state) {
  // Only allow communicating cards you have
  if (!state.players[state.this_player].hand.includes(card)) {
    throw new Error("Card not possessed.");
  }
  // Only allow communicating once
  if (
    state.players[state.this_player].communication_qualifier !==
    Communication.NotCommunicated
  ) {
    throw new Error("Player has already communicated.");
  }
  // Do not allow communicating trump cards
  if (card.suite === state.trump_suit) {
    throw new Error("Cannot communicate cards of the trump suite.");
  }

  var values = [];
  for (let _card of state.players[state.this_player].hand) {
    if (_card.suite === card.suite) values.push(_card.num);
  }
  // Do not allow communicating a card that's not the lowest, only, or highest
  if (
    values.length !== 1 &&
    Math.min(...values) !== card.num &&
    Math.max(...values) !== card.num
  ) {
    throw new Error(
      "This card is not the lowest, only, or highest of the suite."
    );
  }

  return {
    players: {
      ...state.players,
      [state.this_player]: {
        ...state.players[state.this_player],
        communication_card: card,
        communication_qualifier: state.dead_spot
          ? Communication.DeadSpot
          : Communication.Communicating,
      },
    },
  };
}

export function communicateValue(value, state) {
  // Do not allow communicating value during reception dead spot
  if (state.dead_spot) {
    throw new Error("Cannot communicate during reception dead spot.");
  }
  // Only allow communicating value after a card has been placed
  if (
    state.players[state.this_player].communication_qualifier !==
    Communication.Communicating
  ) {
    throw new Error("Player has not placed a card yet.");
  }

  var values = [];
  for (let card of state.players[state.this_player].hand) {
    if (
      card.suite === state.players[state.this_player].communication_card.suite
    )
      values.push(card.num);
  }
  // Ensure correct communication value
  if (value === Communication.Only && values.length !== 1) {
    throw new Error("This is not your only card of the suite.");
  }
  if (
    value === Communication.Highest &&
    Math.max(...values) !==
      state.players[state.this_player].communication_card.num
  ) {
    throw new Error("This is not your highest card of the suite.");
  }
  if (
    value === Communication.Lowest &&
    Math.min(...values) !==
      state.players[state.this_player].communication_card.num
  ) {
    throw new Error("This is not your lowest card of the suite.");
  }

  return {
    players: {
      ...state.players,
      [state.this_player]: {
        ...state.players[state.this_player],
        communication_qualifier: value,
      },
    },
  };
}

export function startTrick(state) {
  // Check no player is communicating
  var communicating = false;
  for (let i = 0; i < state.num_players; i++) {
    communicating =
      communicating ||
      state.players[i].communication_qualifier === Communication.Communicating;
  }
  if (communicating) {
    throw new Error("Cannot start trick while a player is communicating.");
  }

  var trick: any = {};
  for (let i = 0; i < state.num_players; i++) {
    trick[i] = {};
  }
  trick.suite = undefined;

  return {
    current_trick: trick,
  };
}

export function endTrick(state) {
  var last_trick = { ...state.current_trick };

  // Decide winner
  var winner = undefined;
  var winner_num = 0;
  var winner_suite = last_trick.suite;
  for (let i = 0; i < state.num_players; i++) {
    let card = last_trick[i];
    if (
      (card.suite === winner_suite && card.num > winner_num) ||
      (card.suite !== winner_suite && card.suite === state.trump_suit)
    ) {
      winner = i;
      winner_num = card.num;
      winner_suite = card.suite;
    }
  }

  // Push last trick to all_tricks
  state.all_tricks.push(last_trick);

  // Check win conditions
  var condition = state.condition;

  var goals = [...state.goals];

  for (let i = 0; i < state.num_players; i++) {
    let card = last_trick[i];
    for (let goal of goals) {
      if (card.num === goal.num && card.suite === goal.suite) {
        if (goal.player === winner) {
          goal.accomplished = true;
        } else {
          goal.accomplished = false;
          condition = Condition.Lost;
        }
      }
    }
  }

  if (goals.every((goal) => goal.accomplished)) condition = Condition.Won;

  return {
    goals: goals,
    current_trick: undefined,
    last_winner: winner,
    condition: condition,
    players: {
      ...state.players,
      [winner]: {
        ...state.players[winner],
        tricks_won: state.players[winner].tricks_won + 1,
      },
    },
  };
}
