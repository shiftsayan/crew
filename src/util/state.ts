import { Agent, Communication, Condition, GoldenBorder, Phase, Suite, View } from "./enums"
import { missions } from "./missions"
import { mapPhaseToDetails } from "./phases"
import { shuffle } from "./random"

const SUITES = [Suite.Black, Suite.Blue, Suite.Green, Suite.Red, Suite.Yellow,]
const TRUMP_SUIT = Suite.Black

export function getInitialState(setup_data) {
    const state = { ...setup_data }

    state.condition = Condition.None

    state.phase = Phase.Preflight
    state.current_player = undefined

    state.suites = SUITES
    state.trump_suit = TRUMP_SUIT

    state.suites = SUITES
    state.cards = []
    for (let suite of SUITES) {
        for (let num = 1; num <= (suite === state.trump_suit ? 4 : 9); num++) {
            state.cards.push({ num: num, suite: suite })
        }
    }
    state.played_cards = []

    state.max_tricks = Math.floor(state.cards.length / setup_data.num_players)

    state.goals = []

    const mission_details = missions[setup_data.mission.version][setup_data.mission.num]
    state.num_goals = mission_details.num_goals
    state.orders = mission_details.orders || []
    state.dead_spot = mission_details.dead_spot

    state.golden_border = mission_details.golden_border ? GoldenBorder.Available : GoldenBorder.None

    state.players = {}
    state.current_trick = undefined
    for (let i = 0; i < setup_data.num_players; i++) {
        state.players[i] = {
            name: setup_data.names[i],
            hand: [],
            goals: [],
            tricks_won: 0,
            communication_card: {},
            communication_qualifier: Communication.NotCommunicated,
        }
    }

    state.all_tricks = []
    state.last_winner = undefined

    state.view = View.Trick

    return state
}

export function advancePhase(state) {
    var phase_details = mapPhaseToDetails[state.phase]

    // Execute on_end phase of current phase
    var on_end_updates: any = {}
    if (phase_details.on_end) {
        on_end_updates = phase_details.on_end(state)
    }

    var next_phase = phase_details.next_phase(state)
    var next_phase_details = mapPhaseToDetails[next_phase]

    // Decide the player who starts the next phase
    var next_player = undefined
    switch (next_phase_details.starting_agent) {
        case Agent.All:
        case Agent.Current:
            next_player = state.current_player
            break
        case Agent.Next:
            next_player = (state.current_player + 1) % (state.num_players)
            break
        case Agent.Commander:
            next_player = { ...state, ...on_end_updates }.commander
            break
        case Agent.Winner:
            next_player = { ...state, ...on_end_updates }.last_winner
            if (next_player === undefined)
                next_player = { ...state, ...on_end_updates }.commander
            break
    }

    // Execute onBegin phase of next phase
    var on_begin_updates = {}
    if (next_phase_details.on_begin) {
        on_begin_updates = next_phase_details.on_begin(state)
    }

    return {
        ...on_end_updates,
        phase: next_phase,
        current_player: next_player,
        this_player: next_player, // TODO
        ...on_begin_updates,
    }
}

export function dealCardsAndGoals(state) {
    var cards = shuffle([...state.cards])

    var player = 0
    var commander = undefined

    while (cards.length !== 0) {
        var card = cards.pop()
        if (card.suite === state.trump_suit && card.num === 4) {
            commander = player
            commander = state.this_player // TODO
        }
        state.players[player].hand.push(card)
        player = (player + 1) % state.num_players
    }

    var goals = shuffle([...state.cards])

    var i = 0
    while (i !== state.num_goals) {
        var goal = goals.pop()
        if (goal.suite !== state.trump_suit) {
            state.goals.push({
                ...goal,
                order: state.orders[i],
                accomplished: undefined,
            })
            i++
        }
    }

    return {
        commander: commander,
    }
}

export function toggleGoal(goal_idx, state) {
    // Only allow discarding goals in GoldenBorderDiscard phase
    if (state.goals[goal_idx].player !== undefined && state.phase !== Phase.GoldenBorderDiscard) {
        throw new Error("Goal already chosen.")
    }

    var previous_player = state.goals[goal_idx].player
    var selection = previous_player === undefined
    var new_player = selection ? state.this_player : undefined

    // Update goals with the new player
    var goals = [...state.goals]
    var goal = {
        ...goals[goal_idx],
        player: new_player,
    }
    goals[goal_idx] = goal


    var player_goals = []
    if (selection)
        player_goals = state.players[new_player].goals.concat(goal)
    else
        player_goals = state.players[previous_player].goals.filter((_goal) => !(_goal.num === goal.num && _goal.suite === goal.suite))

    return {
        goals: goals,
        players: {
            ...state.players,
            [new_player || previous_player]: {
                ...state.players[new_player || previous_player],
                goals: player_goals,
            },
        },
        golden_border: selection ? state.golden_border : GoldenBorder.Used,
    }
}

export function playCard(card, state) {
    // Only allow playing cards you have
    if (!state.players[state.this_player].hand.includes(card)) {
        throw new Error("Card not possessed.")
    }
    if (state.current_trick.suite &&                // If trick has already been started
        card.suite !== state.current_trick.suite && // and card's suite does not match trick suite
        !state.players[state.this_player].hand.every(
            (_card) => _card.suite !== state.current_trick.suite   // then the player must not have a card of the trick suite.
        )
    ) {
        throw new Error("Must play card of trick suite when possible")
    }

    // Remove card from hand
    var new_hand = state.players[state.this_player].hand.filter((_card) => !(_card.num === card.num && _card.suite === card.suite))

    // Add card to played cards
    state.played_cards.push(card)

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
        }
    }
}

export function communicateCard(card, state) {
    // Only allow communicating cards you have
    if (!state.players[state.this_player].hand.includes(card)) {
        throw new Error("Card not possessed.")
    }
    // Only allow communicating once
    if (state.players[state.this_player].communication_qualifier !== Communication.NotCommunicated) {
        throw new Error("Player has already communicated.")
    }
    // Do not allow communicating trump cards
    if (card.suite === state.trump_suit) {
        throw new Error("Cannot communicate cards of the trump suite.")
    }

    var values = []
    for (let _card of state.players[state.this_player].hand) {
        if (_card.suite === card.suite)
            values.push(_card.num)
    }
    // Do not allow communicating a card that's not the lowest, only, or highest
    if (values.length !== 1 && Math.min(...values) !== card.num && Math.max(...values) !== card.num) {
        throw new Error("This card is not the lowest, only, or highest of the suite.")
    }


    return {
        players: {
            ...state.players,
            [state.this_player]: {
                ...state.players[state.this_player],
                communication_card: card,
                communication_qualifier: state.dead_spot ? Communication.DeadSpot : Communication.Communicating,
            },
        },
    }
}

export function communicateValue(value, state) {
    // Do not allow communicating value during reception dead spot
    if (state.dead_spot) {
        throw new Error("Cannot communicate during reception dead spot.")
    }
    // Only allow communicating value after a card has been placed
    if (state.players[state.this_player].communication_qualifier !== Communication.Communicating) {
        throw new Error("Player has not placed a card yet.")
    }

    var values = []
    for (let card of state.players[state.this_player].hand) {
        if (card.suite === state.players[state.this_player].communication_card.suite)
            values.push(card.num)
    }
    // Ensure correct communication value
    if (value === Communication.Only && values.length !== 1) {
        throw new Error("This is not your only card of the suite.")
    }
    if (value === Communication.Highest && Math.max(...values) !== state.players[state.this_player].communication_card.num) {
        throw new Error("This is not your highest card of the suite.")
    }
    if (value === Communication.Lowest && Math.min(...values) !== state.players[state.this_player].communication_card.num) {
        throw new Error("This is not your lowest card of the suite.")
    }

    return {
        players: {
            ...state.players,
            [state.this_player]: {
                ...state.players[state.this_player],
                communication_qualifier: value,
            },
        },
    }
}

export function startTrick(state) {
    // Check no player is communicating
    var communicating = false
    for (let i = 0; i < state.num_players; i++) {
        communicating = communicating || (state.players[i].communication_qualifier === Communication.Communicating)
    }
    if (communicating) {
        throw new Error("Cannot start trick while a player is communicating.")
    }

    var trick: any = {}
    for (let i = 0; i < state.num_players; i++) {
        trick[i] = {}
    }
    trick.suite = undefined

    return {
        current_trick: trick
    }
}

export function endTrick(state) {
    var last_trick = { ...state.current_trick }

    // Decide winner
    var winner = undefined;
    var winner_num = 0;
    var winner_suite = last_trick.suite;
    for (let i = 0; i < state.num_players; i++) {
        let card = last_trick[i]
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
    state.all_tricks.push(last_trick)

    // Check win conditions
    var condition = state.condition;

    var goals = [...state.goals]

    for (let i = 0; i < state.num_players; i++) {
        let card = last_trick[i]
        for (let goal of goals) {
            if (card.num === goal.num && card.suite === goal.suite) {
                if (goal.player === winner) {
                    goal.accomplished = true
                }
                else {
                    goal.accomplished = false
                    condition = Condition.Lost
                }
            }
        }
    }

    if (goals.every((goal) => goal.accomplished))
        condition = Condition.Won

    return {
        goals: goals,
        current_trick: undefined,
        last_winner: winner,
        condition: condition,
        players: {
            ...state.players,
            [winner]: {
                ...state.players[winner],
                tricks_won: state.players[winner].tricks_won + 1
            }
        }
    }
}
