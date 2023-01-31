import { AgentAll, AgentCommander, AgentWinner } from "../mechanics/agent";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class CTA extends Move {
  async validateParams() {
    // GoldenBorderDiscard
    const goldenBorderDiscard =
      this.game.phase === PhaseName.GoldenBorderDiscard &&
      AgentCommander.check(this.state.player, this.game);
    // Communicate
    const communicate =
      this.game.phase === PhaseName.Communicate &&
      AgentWinner.check(this.state.player, this.game);
    // EndGame
    const endGame =
      this.game.phase === PhaseName.EndGame &&
      AgentAll.check(this.state.player, this.game);

    return goldenBorderDiscard || communicate || endGame;
  }

  updateGame() {
    return {
      advance_phase: true,
    };
  }
}
