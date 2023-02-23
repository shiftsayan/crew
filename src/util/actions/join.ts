import { Move } from "./move";

export class Join extends Move {
  async validateParams(player) {
    return (
      !this.state.player && // player is not set
      !this.game.active[player] // player is not taken
    );
  }

  updateState(player) {
    return {
      player: player,
    };
  }

  updateGame(player) {
    return {
      active: {
        [player]: true,
      },
    };
  }
}
