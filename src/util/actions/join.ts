import { Move } from "./move";

export class Join extends Move {
    validateParams(player): boolean {
        return !this.game.players[player].active
    }

    commitState(player): void {
        return {
            ...this.state,
            this_player: player,
        }
    }

    commitGame(player) {
        return {
            [`crews/thethecrewcrew/players/${player}/active`]: true
        };
    }
}