import { GoldenBorder } from "../enums";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class Toggle extends Move {
  async validateParams(goal_idx) {
    // Only allow discarding goals in GoldenBorderDiscard phase
    return (
      this.game.goals[goal_idx].player === undefined ||
      this.game.phase === PhaseName.GoldenBorderDiscard
    );
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
      ).concat(goal);

      return {
        goals: goals,
        players: {
          [this.state.player]: {
            goals: player_goals,
          },
        },
        golden_border:
          this.game.golden_border === GoldenBorder.Using
            ? GoldenBorder.Used
            : this.game.golden_border,
      };
    } else {
      const goals = [...this.game.goals];
      const goal = goals[goal_idx];
      delete goals[goal_idx].player;

      const player_goals = (
        this.game.players[previous_player].goals ?? []
      ).filter(
        (_goal) => !(_goal.num === goal.num && _goal.suite === goal.suite)
      );

      return {
        goals: goals,
        players: {
          [previous_player]: {
            goals: player_goals,
          },
        },
        golden_border: GoldenBorder.Using,
      };
    }
  }
}
