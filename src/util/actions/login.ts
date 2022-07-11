import { Action } from "./action";

export class Login extends Action {
    validateParams(username, password) {
        if (!username) {
            this.setState({
                ...this.state,
                toast: {
                    style: "error",
                    text: "Invalid Username",
                }
            })
            return false;
        }
        if (!password) {
            this.setState({
                ...this.state,
                toast: {
                    style: "error",
                    text: "Invalid Password",
                }
            })
            return false;
        }
    }

    commitState(username, password): void {
        this.setState({
            ...this.state,
            crew: username,
            toast: {
                style: "success",
                text: "Logged In",
            }
        })
    }
}