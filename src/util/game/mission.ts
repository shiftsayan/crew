import { Order, Suite } from "../enums"

type Card = {
    num: number,
    suite: Suite,
}

abstract class BaseMission {
    num_goals: number
    orders: Order[]
    dead_spot: boolean
    winners: Card[]
    losers: Card[]

    constructor(
        num_goals,
        orders = [],
        dead_spot = false,
        winners = [],
        losers = [],
    ) {
        this.num_goals = num_goals
        this.orders = orders
        this.dead_spot = dead_spot
        this.winners = winners
        this.losers = losers
    }

    abstract accomplished(game)
}

export class Mission extends BaseMission {
    accomplished(game) {
        return true
    }
}
