import { Communication } from "../enums";
import { AgentAll, AgentCommander, AgentWinner } from "../mechanics/agent";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class CTA extends Move<[]> {
  async validateParams(): Promise<string | void> {
    // ChooseGoals
    if (this.game.phase === PhaseName.ChooseGoals) {
      const allGoalsChosen = this.game.goals.every(
        (goal) => goal.player !== undefined
      );
      if (!allGoalsChosen) {
        return "Wait For All Goals To Be Chosen";
      }
      return;
    }

    // Communicate
    if (this.game.phase === PhaseName.Communicate) {
      const names = Object.keys(this.game.active);
      const someoneCommunicating = names.some(
        (name) =>
          this.game.players[name].communication.qualifier ===
          Communication.Communicating
      );
      if (someoneCommunicating) {
        return "Wait For All Players To Finish Communicating";
      }
      return;
    }

    // EndGame
    const endGame =
      this.game.phase === PhaseName.EndGame &&
      AgentAll.check(this.state.player, this.game);

    if (endGame) {
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
