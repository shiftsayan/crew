import { Move } from "./move";

export class ToggleMove extends Move<[number]> {
  name = "Toggle";

  async validateParams(goalIdx: number) {
    // Check goalIdx is valid
    if (goalIdx < 0 || goalIdx >= this.game.goals.length) {
      return "Invalid goal";
    }
  }

  updateGame(goalIdx: number) {
    const previousPlayer = this.game.goals[goalIdx].player;
    const selection = previousPlayer === undefined;

    if (selection) {
      const goals = [...this.game.goals];
      const goal = {
        ...goals[goalIdx],
        player: this.state.player,
      };
      goals[goalIdx] = goal;

      const playerGoals = (
        this.game.players[this.state.player].goals ?? []
      ).concat(goalIdx);

      return {
        goals: goals,
        players: {
          [this.state.player]: {
            goals: playerGoals,
          },
        },
      };
    } else {
      const goals = [...this.game.goals];
      delete goals[goalIdx].player;

      const playerGoals = (
        this.game.players[previousPlayer].goals ?? []
      ).filter((iterGoalIdx) => !(goalIdx === iterGoalIdx));

      return {
        goals: goals,
        players: {
          [previousPlayer]: {
            goals: playerGoals,
          },
        },
      };
    }
  }
}
