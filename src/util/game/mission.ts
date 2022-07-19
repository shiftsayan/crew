import { GoldenBorder, Order, Suite } from "../enums"

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
    golden_border: GoldenBorder

    constructor(
        num_goals,
        orders = [],
        dead_spot = false,
        winners = [],
        losers = [],
        golden_border = false,
    ) {
        this.num_goals = num_goals
        this.orders = orders
        this.dead_spot = dead_spot
        this.winners = winners
        this.losers = losers
        this.golden_border = golden_border ? GoldenBorder.Available : GoldenBorder.NotAvailable
        // TODO
        this.golden_border = GoldenBorder.Available
    }

    abstract accomplished(game)
}

export class Mission extends BaseMission {
    accomplished(game) {
        return true
    }
}
