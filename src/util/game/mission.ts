import { Condition, Order, Status } from "../enums";
import { CrewCardType } from "../types";

abstract class Mission {
  numGoals: number;
  orders: Order[];
  deadSpot: boolean;
  winners: CrewCardType[];
  losers: CrewCardType[];

  constructor(
    numGoals: number,
    orders: Order[] = [],
    deadSpot: boolean = false,
    winners = [],
    losers = []
  ) {
    this.numGoals = numGoals;
    this.orders = orders;
    this.deadSpot = deadSpot;
    this.winners = winners;
    this.losers = losers;
  }

  abstract check(...params);
}

export class MissionPlanetX extends Mission {
  check(state, game): Condition {
    return Condition.InProgress;
    //   const initialCount = goals.reduce(
    //     (count, goal) => (goal.status === Status.Success ? count + 1 : count),
    //     0
    //   );
    //   let queue = [];
    //   let condition = Condition.InProgress;

    //   for (let player in trick) {
    //     const card = trick[player];
    //     for (let goal of goals) {
    //       if (card.num === goal.num && card.suite === goal.suite) {
    //         if (goal.player === winner) {
    //           goal.status = Status.Success;
    //           queue.push(goal);
    //         } else {
    //           goal.status = Status.Failure;
    //           condition = Condition.Lost;
    //         }
    //       }
    //     }
    //   }

    //   // Remove compatible orders
    //   [
    //     { source: Order.Three, target: Order.Four },
    //     { source: Order.Two, target: Order.Three },
    //     { source: Order.One, target: Order.Two },
    //     { source: Order.Second, target: Order.Third },
    //     { source: Order.First, target: Order.Second },
    //   ].forEach(({ source, target }) => {
    //     if (queue.some((goal) => goal.order === source)) {
    //       queue = queue.filter((goal) => goal.order !== target);
    //     }
    //   });

    //   let ok = true;
    //   for (let goal of queue) {
    //     switch (goal.order) {
    //       case Order.One:
    //         ok = ok && initialCount === 0;
    //         break;
    //       case Order.Two:
    //         ok = ok && initialCount === 1;
    //         break;
    //       case Order.Three:
    //         ok = ok && initialCount === 2;
    //         break;
    //       case Order.Four:
    //         ok = ok && initialCount === 3;
    //         break;
    //       case Order.First:
    //         break;
    //       case Order.Second:
    //         ok =
    //           ok &&
    //           goals.some(
    //             (goal) =>
    //               goal.order === Order.First && goal.status === Status.Success
    //           );
    //         break;
    //       case Order.Third:
    //         ok =
    //           ok &&
    //           goals.some(
    //             (goal) =>
    //               goal.order === Order.Second && goal.status === Status.Success
    //           );
    //         break;
    //       case Order.Last:
    //         ok = ok && goals.every((goal) => goal.status === Status.Success);
    //         break;
    //       case Order.LastTrick:
    //         ok = ok && tricks.length === maxTricks;
    //         break;
    //     }
    //   }
    //   if (!ok) condition = Condition.Lost;
    //   else if (goals.every((goal) => goal.status === Status.Success))
    //     condition = Condition.Won;

    //   return condition;
  }
}

export class MissionDeepSea {
  maxDifficulty: number;

  constructor(maxDifficulty: number) {
    this.maxDifficulty = maxDifficulty;
  }

  check(state, game): Condition {
    const goals = game.goals;

    // if any goal has Status.Failure, return Condition.Lost
    const anyLoss = goals.reduce(
      (res, goal) => res || goal.status === Status.Failure,
      false
    );
    if (anyLoss) return Condition.Lost;

    // if all goals have Status.Success, return Condition.Won
    const allSuccess = goals.reduce(
      (res, goal) => res && goal.status === Status.Success,
      true
    );
    if (allSuccess) return Condition.Won;

    // all goals are Status.Success or Status.InProgress (at least 1)
    return Condition.InProgress;
  }
}
