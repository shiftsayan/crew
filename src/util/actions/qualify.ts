import { Communication } from "../enums";
import { Move } from "./move";

export class Qualify extends Move {
  async validateParams(qualifer: Communication, player: string) {
    // TODO(Sayan): Add correctness check
    console.log({
      1: this.game.players[this.state.player].communication.qualifier,
      2:
        this.game.players[this.state.player].communication.qualifier ===
        Communication.Communicating,
    });
    return (
      player === this.state.player &&
      this.game.players[this.state.player].communication.qualifier ===
        Communication.Communicating
    );
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
