abstract class AgentBase {
    static check(player, game) { }

    static get(game) { return game.current }

    static next(game) { return game.current }
}

export class AgentNone extends AgentBase {
    static check(player, game) {
        return false
    }
}

export class AgentAuto extends AgentBase {
    static check(player, game) {
        return false
    }
}

export class AgentAll extends AgentBase {
    static check(player, game) {
        return true
    }
}

export class AgentCurrent extends AgentBase {
    static check(player, game) {
        return player === game.seating[game.current]
    }

    static next(game) {
        return (game.current + 1) % game.num_players
    }
}

export class AgentNext extends AgentBase {
    static check(player, game) {
        return true
    }
}

export class AgentWinner extends AgentBase {
    static check(player, game) {
        return true
    }
}

export class AgentCommander extends AgentBase {
    static check(player, game) {
        return true
    }

    static get(game) {
        return game.commander
    }
}