import { Move } from "./move";

export class Join extends Move {
    validateParams(player): boolean {
        return !this.state.player  // player is not set
            && !this.game.players[player].active  // player is not taken
    }

    commitState(player): void {
        return {
            ...this.state,
            player: player,
        }
    }

    commitGame(player) {
        return {
            [`crews/thethecrewcrew/players/${player}/active`]: true
        };
    }
}