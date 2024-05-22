import { Move } from "./move";

export class JoinMove extends Move<[string]> {
  name = "Join";

  async validateParams(player: string): Promise<string | void> {
    if (
      !this.state.player && // player is not set
      !this.game.active[player] // player is not taken
    ) {
      return;
    } else {
      return "Invalid Join";
    }
  }

  updateState(player: string) {
    return {
      player: player,
    };
  }

  updateGame(player: string) {
    return {
      active: {
        [player]: true,
      },
    };
  }
}
