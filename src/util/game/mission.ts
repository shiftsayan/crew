import { Condition, GoldenBorder, Order, Status, Suite } from "../enums";

type Card = {
  num: number;
  suite: Suite;
};

abstract class Mission {
  num_goals: number;
  orders: Order[];
  dead_spot: boolean;
  winners: Card[];
  losers: Card[];
  golden_border: GoldenBorder;

  constructor(
    num_goals,
    orders = [],
    dead_spot = false,
    winners = [],
    losers = [],
    golden_border = false
  ) {
    this.num_goals = num_goals;
    this.orders = orders;
    this.dead_spot = dead_spot;
    this.winners = winners;
    this.losers = losers;
    this.golden_border = golden_border
      ? GoldenBorder.Available
      : GoldenBorder.NotAvailable;
    // TODO
    this.golden_border = GoldenBorder.Available;
  }

  abstract check(...params);
}

export class MissionOrder extends Mission {
  check(winner, goals, trick, tricks, max_tricks): Condition {
    const initialCount = goals.reduce(
      (count, goal) => (goal.status === Status.Success ? count + 1 : count),
      0
    );
    let queue = [];
    let condition = Condition.InProgress;

    for (let player in trick) {
      const card = trick[player];
      for (let goal of goals) {
        if (card.num === goal.num && card.suite === goal.suite) {
          if (goal.player === winner) {
            goal.status = Status.Success;
            queue.push(goal);
          } else {
            goal.status = Status.Failure;
            condition = Condition.Lost;
          }
        }
      }
    }

    // Remove compatible orders
    [
      { source: Order.Three, target: Order.Four },
      { source: Order.Two, target: Order.Three },
      { source: Order.One, target: Order.Two },
      { source: Order.Second, target: Order.Third },
      { source: Order.First, target: Order.Second },
    ].forEach(({ source, target }) => {
      if (queue.some((goal) => goal.order === source)) {
        queue = queue.filter((goal) => goal.order !== target);
      }
    });

    let ok = true;
    for (let goal of queue) {
      switch (goal.order) {
        case Order.One:
          ok = ok && initialCount === 0;
          break;
        case Order.Two:
          ok = ok && initialCount === 1;
          break;
        case Order.Three:
          ok = ok && initialCount === 2;
          break;
        case Order.Four:
          ok = ok && initialCount === 3;
          break;
        case Order.First:
          break;
        case Order.Second:
          ok =
            ok &&
            goals.some(
              (goal) =>
                goal.order === Order.First && goal.status === Status.Success
            );
          break;
        case Order.Third:
          ok =
            ok &&
            goals.some(
              (goal) =>
                goal.order === Order.Second && goal.status === Status.Success
            );
          break;
        case Order.Last:
          ok = ok && goals.every((goal) => goal.status === Status.Success);
          break;
        case Order.LastTrick:
          ok = ok && tricks.length === max_tricks;
          break;
      }
    }
    if (!ok) condition = Condition.Lost;
    else if (goals.every((goal) => goal.status === Status.Success))
      condition = Condition.Won;

    return condition;
  }
}

export class MissionCustom extends Mission {
  check(winner, goals, trick, tricks, max_tricks): Condition {
    if (tricks.length === max_tricks) {
      return Condition.Lost;
    }
    return Condition.InProgress;
  }
}

export class MissionDeepSea {
  max_difficulty: number;

  constructor(max_difficulty: number) {
    this.max_difficulty = max_difficulty;
  }

  check(winner, goals, trick, tricks, max_tricks): Condition {
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
