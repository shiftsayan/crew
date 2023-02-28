import { Communication } from "../enums";
import { Move } from "./move";

export class Qualify extends Move<[Communication, string]> {
  async validateParams(
    qualifer: Communication,
    player: string
  ): Promise<string | void> {
    // TODO(Sayan): Add correctness check
    if (
      this.game.players[this.state.player].communication.qualifier ===
        Communication.Communicating &&
      player === this.state.player
    ) {
      return;
    } else {
      return "Invalid Qualify";
    }
  }

  updateGame(qualifier: Communication, player: string) {
    const newCard =
      qualifier === Communication.Cancel
        ? null
        : this.game.players[this.state.player].communication.card;
    const newQualifier =
      qualifier === Communication.Cancel
        ? Communication.NotCommunicated
        : qualifier;

    return {
      players: {
        [this.state.player]: {
          communication: {
            card: newCard,
            qualifier: newQualifier,
          },
        },
      },
    };
  }
}
