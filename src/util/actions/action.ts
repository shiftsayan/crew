export abstract class Action {
    state
    setState

    constructor(state, setState) {
        this.state = state
        this.setState = setState
    }

    async validateParams(...params) {
        return true
    }

    _commitState(updates) {
        this.setState(updates)
    }

    commitState(...params) {
        return this.state
    }

    async postRun(...params) { }

    async run(...params) {
        if (!(await this.validateParams(...params))) {
            return
        }
        this._commitState(this.commitState(...params))
        this.postRun(...params)
    }
}
