import { ref, update } from "@firebase/database";
import { database } from "../../services/firebase";
import { getFreshGameConfiguration as getNewGameConfiguration } from "../game";
import { Move } from "./move";

export class Join extends Move {
    async validateParams(player) {
        return !this.state.player  // player is not set
            && !this.game.active[player]  // player is not taken
    }

    commitState(player) {
        return {
            ...this.state,
            player: player,
        }
    }

    commitGame(player) {
        return {
            [`crews/${this.state.crew}/active/${player}`]: true
        };
    }

    async postRun(player) {
        // initialize game state
        const names = Object.keys(this.game.active)
        const allActive = names.filter(key => key !== player).reduce((res, key) => res && this.game.active[key], true)
        if (allActive) {
            const configuration = getNewGameConfiguration(names, this.game.mission)
            const updates = {}
            for (const key in configuration) {
                updates[`crews/${this.state.crew}/${key}`] = configuration[key]
            }
            update(ref(database), updates);
        }
    }
}