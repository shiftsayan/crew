import { ref, update } from "@firebase/database"
import { database } from "../../services/firebase"
import { Action } from "./action"

export abstract class Move extends Action {
    game
    setGame

    constructor(state, setState, game, setGame) {
        super(state, setState)
        this.game = game
        this.setGame = setGame
    }

    validateAgency(...params) {
        return true
    }

    validatePhase(...params) {
        return true
    }

    _commitGame(updates) {
        return update(ref(database), updates);
    }

    commitGame(...params) {
        return {}
    }

    async postRun(...params) {

    }

    async run(...params) {
        if (!(this.validatePhase(...params)) ||
            !(this.validateAgency(...params)) ||
            !(await this.validateParams(...params))
        ) {
            return
        }

        this._commitState(this.commitState(...params))
        this._commitGame(this.commitGame(...params))

        this.postRun(...params)
    }
}