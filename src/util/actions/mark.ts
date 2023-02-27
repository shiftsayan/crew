import { Condition, GoldenBorder, Status } from "../enums";
import { missions } from "../game/missions";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class Mark extends Move {
  async validateParams(goal_idx) {
    return true;
  }

  updateGame(goal_idx) {
    const goals = [...this.game.goals];
    const goal = goals[goal_idx];
    const status = goal.status;
    if (status === Status.Chosen || status === Status.NotChosen) {
      goal.status = Status.Success;
    } else if (status === Status.Success) {
      goal.status = Status.Failure;
    } else if (status === Status.Failure) {
      goal.status = Status.Success;
    }
    goals[goal_idx] = goal;

    let condition = Condition.InProgress;
    if (this.game.phase === PhaseName.EndGame) {
      const mission_data =
        missions[this.game.mission.version][this.game.mission.num];
      condition = mission_data.check(this.state, this.game);
    }

    return {
      goals: goals,
      condition: condition,
    };
  }
}