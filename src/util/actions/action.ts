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

    commitState(...params) { }

    run(...params) {
        if (!this.validateParams(...params)) {
            return
        }
        this.commitState(...params)
    }
}