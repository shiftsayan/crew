import { Condition, Status } from "../enums";
import { missions } from "../game/missions";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class MarkMove extends Move<[number]> {
  name = "Mark";

  async validateParams(goalIdx: number): Promise<string | void> {
    return;
  }

  updateGame(goalIdx: number) {
    const goals = [...this.game.goals];
    const goal = goals[goalIdx];
    const status = goal.status;
    if (status === Status.Success) {
      goal.status = Status.Failure;
    } else if (status === Status.Failure) {
      goal.status = Status.Chosen;
    } else {
      goal.status = Status.Success;
    }
    goals[goalIdx] = goal;

    let condition = Condition.InProgress;
    if (this.game.phase === PhaseName.EndGame) {
      const missionData =
        missions[this.game.mission.version][this.game.mission.num];
      condition = missionData.check(this.state, this.game);
    }

    return {
      goals: goals,
      condition: condition,
    };
  }
}
