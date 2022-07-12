import { child, get, ref, update } from "@firebase/database";
import { database } from "../../services/firebase";
import { shuffle } from "../random";
import { Action } from "./action";

const SECONDS_IN_DAY = 60 * 60 * 24
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

    // Reset game state
    postRun(username, password) {
        // Update seating
        get(child(ref(database), `crews/${username}/seating_ttl`)).then((snapshot) => {
            if (snapshot.val() < Date.now()) {
                update(ref(database), {
                    [`crews/${username}/seating`]: shuffle(["mewtwo", "shift", "sml", "Steven", "thepinetree"]),
                    [`crews/${username}/seating_ttl`]: Date.now() + SECONDS_IN_DAY,
                });
            }
        })

    }
}