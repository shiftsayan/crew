import { Join } from "../actions/join";
import { Toggle } from "../actions/toggle";
import { Communication, Condition, GoldenBorder, Order, Status } from "../enums";
import { CARDS, SUIT_TRUMP } from "../game";
import { missions } from "../game/missions";
import { shuffle } from "../random";
import { AgentAll, AgentAuto, AgentCommander, AgentCurrent, AgentNone } from "./agent";

export enum PhaseName {
    None = "",
    Lobby = "Lobby",
    Preflight = "Preflight",
    DealCards = "DealCards",
    ChooseGoals = "ChooseGoals",
    DealGoals = "DealGoals",
    GoldenBorderDiscard = "GoldenBorderDiscard",
    GoldenBorderAccept = "GoldenBorderAccept",
    Limbo = "Limbo",

    // Communicate,
    // PlayTrick,
}

export abstract class Phase {
    static starter
    static agent
    static moves

    static ended(state, game) {
        return false
    }

    static next(state, game) { }

    static onStart(state, game) {
        return {}
    }

    static onEnd(state, game) {
        return {}
    }
}

export class Preflight extends Phase {
    static starter = AgentNone
    static agent = AgentAll
    static moves = [Join]

    static ended(state, game) {
        // all players are active
        const names = Object.keys(game.active)
        return names.reduce((res, key) => res && game.active[key], true)
    }

    static next(state, game) {
        return DealCards
    }

    static onEnd(state, game) {
        const names = Object.keys(game.active)

        const players = {}
        for (const name of names) {
            players[name] = {
                communication: {
                    qualifier: Communication.NotCommunicated,
                },
                hand: [],
                goals: [],
                tricks_won: 0,
            }
        }

        const mission_data = missions[game.mission.version][game.mission.num]

        return {
            players: players,
            goals: [],
            condition: Condition.InProgress,
            max_tricks: Math.floor(CARDS.length / names.length),
            golden_border: mission_data.golden_border
        }
    }
}

export class DealCards extends Phase {
    static starter = AgentAuto
    static agent = AgentAuto
    static moves = []

    static ended(state, game) {
        return true;
    }

    static next(state, game) {
        return DealGoals
    }

    static onStart(state, game) {
        const names = Object.keys(game.active)
        const players = game.players

        const all_cards = shuffle([...CARDS])
        let commander = null
        let idx = 0
        while (all_cards.length !== 0) {
            let card = all_cards.pop()
            if (card.suite === SUIT_TRUMP && card.num === 4) {
                commander = game.seating.indexOf(names[idx])
            }
            players[names[idx]].hand.push(card)
            idx = (idx + 1) % names.length
        }

        return {
            players: players,
            commander: commander,
        }
    }
}

export class DealGoals extends Phase {
    static starter = AgentAuto
    static agent = AgentAuto
    static moves = []

    static ended(state, game) {
        return true
    }

    static next(state, game) {
        return ChooseGoals
    }

    static onStart(state, game) {
        const mission_data = missions[game.mission.version][game.mission.num]

        const all_goals = shuffle([...CARDS])
        const goals = []
        let count = 0
        while (count !== mission_data.num_goals) {
            let goal = all_goals.pop()
            if (goal.suite !== SUIT_TRUMP) {
                goals.push({
                    ...goal,
                    order: (!mission_data.orders || count >= mission_data.orders.length) ? Order.None : mission_data.orders[count],
                    status: Status.NotChosen,
                })
                count++
            }
        }

        return {
            goals: goals
        }
    }
}

export class ChooseGoals extends Phase {
    static starter = AgentCommander
    static agent = AgentCurrent
    static moves = [Toggle]

    static ended(state, game) {
        return game.goals.every((goal) => goal.player !== undefined)
    }

    static next(state, game) {
        return GoldenBorderDiscard
    }
}

export class GoldenBorderDiscard extends Phase {
    static starter = AgentAll
    static agent = AgentAll
    static moves = [Toggle]

    static ended(state, game) {
        return [GoldenBorder.NotAvailable, GoldenBorder.Using].includes(game.golden_border)
    }

    static next(state, game) {
        return GoldenBorderAccept
    }
}

export class GoldenBorderAccept extends Phase {
    static starter = AgentAll
    static agent = AgentAll
    static moves = [Toggle]

    static ended(state, game) {
        return [GoldenBorder.NotAvailable, GoldenBorder.Skipped, GoldenBorder.Used].includes(game.golden_border)
    }

    static next(state, game) {
        return Limbo
    }
}

export class Limbo extends Phase {
    static starter = AgentCommander
    static agent = AgentAll
    static moves = []

    // TODO
    static next(state, game) { }

    static onStart(state, game) {
        console.log("here")
        return {}
    }
}

export const mapPhaseNameToPhase = {
    [PhaseName.Preflight]: Preflight,
    [PhaseName.DealCards]: DealCards,
    [PhaseName.DealGoals]: DealGoals,
    [PhaseName.ChooseGoals]: ChooseGoals,
    [PhaseName.GoldenBorderDiscard]: GoldenBorderDiscard,
    [PhaseName.GoldenBorderAccept]: GoldenBorderAccept,
    [PhaseName.Limbo]: Limbo
}