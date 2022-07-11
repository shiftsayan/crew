import { Action } from "./action"

export abstract class Move extends Action {
    game
    setGame

    constructor(state, setState, game, setGame) {
        super(state, setState)
        this.game = game
        this.setGame = setGame
    }

    validateAgency(...params): boolean {
        return true
    }

    validatePhase(...params): boolean {
        return true
    }

    async commitGame(...params) { }

    run(...params) {
        if (!this.validatePhase(...params) || !this.validateAgency(...params) || !this.validateParams(...params)) {
            return
        }
        this.commitState(...params)
        this.commitGame(...params)
    }
}