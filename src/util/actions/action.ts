export abstract class Action {
    state
    setState

    constructor(state, setState) {
        this.state = state
        this.setState = setState
    }

    validateParams(...params): boolean {
        return true
    }

    _commitState(updates) {
        this.setState(updates)
    }

    commitState(...params) { }

    postRun() { }

    run(...params) {
        if (!this.validateParams(...params)) {
            return
        }
        this._commitState(this.commitState(...params))
        this.postRun()
    }
}
