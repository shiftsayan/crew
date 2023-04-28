import { Move } from "./move";

export class Join extends Move<[string]> {
  name = "Join";
  async validateParams(player): Promise<string | void> {
    if (
      !this.state.player && // player is not set
      !this.game.active[player] // player is not taken
    ) {
      return;
    } else {
      return "Invalid Join";
    }
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
