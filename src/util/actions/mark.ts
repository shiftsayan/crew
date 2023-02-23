import { GoldenBorder, Status } from "../enums";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class Mark extends Move {
  async validateParams(goal_idx) {
    return true;
  }

  updateGame(goal_idx) {
    // toggle goals[goal_idx] status between Chosen, Success, and Failure
    const goals = [...this.game.goals];
    const goal = goals[goal_idx];
    const status = goal.status;
    if (status === Status.Chosen || status === Status.NotChosen) {
      goal.status = Status.Success;
    } else if (status === Status.Success) {
      goal.status = Status.Failure;
    } else if (status === Status.Failure) {
      goal.status = Status.Chosen;
    }
    goals[goal_idx] = goal;
    return {
      goals: goals,
    };
    return {};
  }
}
