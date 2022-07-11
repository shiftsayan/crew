import { Action } from "./action";

export class Login extends Action {
    validateParams(username, password) {
        if (!username) {
            this.setState({
                ...this.state,
                show_toast: true,
                toast: {
                    style: "error",
                    text: "Invalid Username",
                }
            })
            return false
        }
        if (!password) {
            this.setState({
                ...this.state,
                show_toast: true,
                toast: {
                    style: "error",
                    text: "Invalid Password",
                }
            })
            return false
        }
        return true
    }

    commitState(username, password): void {
        return {
            ...this.state,
            crew: username,
            show_toast: true,
            toast: {
                style: "success",
                text: "Logged In",
            }
        }
    }
}