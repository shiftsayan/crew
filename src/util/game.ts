import { Communication, Condition, OldPhase, Order, Phase, Status, Suite, ViewName } from "./enums"
import { missions } from "./missions"
import { shuffle } from "./random"

export const SUITES = [Suite.Blue, Suite.Green, Suite.Red, Suite.Yellow, Suite.Black]
export const SUIT_TRUMP = Suite.Black

const CARDS = []
for (let suite of SUITES) {
    for (let num = 1; num <= (suite === SUIT_TRUMP ? 4 : 9); num++) {
        CARDS.push({ num: num, suite: suite })
    }
}

export function getFreshGameConfiguration(names, mission) {
    const players = {}
    for (const name of names) {
        players[name] = {
            communication: {
                card: null,
                qualifier: Communication.NotCommunicated,
            },
            hand: [],
            goals: [],
            tricks_won: 0,
        }
    }

    const all_cards = shuffle([...CARDS])
    let commander = null
    let idx = 0
    while (all_cards.length !== 0) {
        let card = all_cards.pop()
        if (card.suite === SUIT_TRUMP && card.num === 4) {
            commander = names[idx]
        }
        players[names[idx]].hand.push(card)
        idx = (idx + 1) % names.length
    }

    const mission_data = missions[mission.version][mission.num]
    const all_goals = shuffle([...CARDS])
    const goals = []
    let count = 0
    while (count !== mission_data.num_goals) {
        let goal = all_goals.pop()
        if (goal.suite !== SUIT_TRUMP) {
            goals.push({
                ...goal,
                order: (!mission_data.orders || count >= mission_data.orders.length) ? Order.None : mission_data.orders.length[count],
                status: Status.NotChosen,
            })
            count++
        }
    }

    return {
        phase: Phase.Preflight,
        players: players,
        commander: commander,
        goals: goals,
        dead_spot: mission_data.dead_spot,
        // condition: Condition.None,
        // played_cards: [],
        // max_tricks: Math.floor(CARDS.length / names.length()),
        // tricks: [],
        // current_player: undefined,
        // last_winner: undefined,
    }

    // state.golden_border = mission_details.golden_border ? GoldenBorder.Available : GoldenBorder.None

    // state.players = {}
    // state.current_trick = undefined
    // for (let i = 0; i < setup_data.num_players; i++) {
    //     state.players[i] = {
    //         name: setup_data.names[i],
    //         hand: [],
    //         goals: [],
    //         tricks_won: 0,
    //         communication_card: {},
    //         communication_qualifier: Communication.NotCommunicated,
    //     }
    // }
}
