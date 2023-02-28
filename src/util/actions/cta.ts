import { Communication } from "../enums";
import { AgentAll, AgentCommander, AgentWinner } from "../mechanics/agent";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class CTA extends Move<[]> {
  async validateParams(): Promise<string | void> {
    // GoldenBorderDiscard
    const goldenBorderDiscard =
      this.game.phase === PhaseName.GoldenBorderDiscard &&
      AgentCommander.check(this.state.player, this.game);

    // Communicate
    const names = Object.keys(this.game.active);
    const someoneCommunicating = names.some(
      (name) =>
        this.game.players[name].communication.qualifier ===
        Communication.Communicating
    );
    const communicate =
      this.game.phase === PhaseName.Communicate &&
      AgentWinner.check(this.state.player, this.game) &&
      !someoneCommunicating;

    // EndGame
    const endGame =
      this.game.phase === PhaseName.EndGame &&
      AgentAll.check(this.state.player, this.game);

    if (goldenBorderDiscard || communicate || endGame) {
      return;
    } else {
      return "Invalid CTA";
    }
  }

  updateGame() {
    return {
      advance_phase: true,
    };
  }
}
