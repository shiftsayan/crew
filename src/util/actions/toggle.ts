import { GoldenBorder } from "../enums";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class Choose extends Move<[number]> {
  async validateParams(goal_idx: number) {
    // Check goal_idx is valid
    if (goal_idx < 0 || goal_idx >= this.game.goals.length) {
      return "Invalid Goal";
    }

    // Only allow discarding goals in GoldenBorderDiscard phase
    if (
      this.game.goals[goal_idx].player === undefined ||
      this.game.phase === PhaseName.GoldenBorderDiscard
    ) {
      return;
    } else {
      return "Invalid Toggle";
    }
  }

  updateGame(goal_idx) {
    const previous_player = this.game.goals[goal_idx].player;
    const selection = previous_player === undefined;

    if (selection) {
      const goals = [...this.game.goals];
      const goal = {
        ...goals[goal_idx],
        player: this.state.player,
      };
      goals[goal_idx] = goal;

      const player_goals = (
        this.game.players[this.state.player].goals ?? []
      ).concat(goal_idx);

      return {
        goals: goals,
        players: {
          [this.state.player]: {
            goals: player_goals,
          },
        },
        // mark GoldenBorder as used if applicable
        golden_border:
          this.game.golden_border === GoldenBorder.Using
            ? GoldenBorder.Used
            : this.game.golden_border,
      };
    } else {
      const goals = [...this.game.goals];
      delete goals[goal_idx].player;

      const player_goals = (
        this.game.players[previous_player].goals ?? []
      ).filter((_goal_idx) => !(goal_idx === _goal_idx));

      return {
        goals: goals,
        players: {
          [previous_player]: {
            goals: player_goals,
          },
        },
        // deselection can only happen in GoldenBorderDiscard phase
        golden_border: GoldenBorder.Using,
      };
    }
  }
}
