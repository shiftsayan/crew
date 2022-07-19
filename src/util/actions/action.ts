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

    commitState(updates) {
        return this.setState({
            ...this.state,
            ...updates,
        })
    }

    updateState(...params) {
        return this.state
    }

    async postRun(...params) { }

    async run(...params) {
        if (!(await this.validateParams(...params))) {
            return
        }
        this.commitState(this.updateState(...params))
        this.postRun(...params)
    }
}
