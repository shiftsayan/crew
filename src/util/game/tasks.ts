import { Suite } from "../enums";

enum TaskPrefix {
  WIN = "Win",
  NOT_WIN = "Not win",
  // LEAD = "I will lead",
  NOT_LEAD = "Not lead",
}

class Task {
  constructor(
    public id: number,
    public description: string,
    public difficulty: number
  ) {
    this.description = description;
    this.difficulty = difficulty;
    this.id = id;
  }
}

export const TASKS = [
  new Task(1, "I will win Green 3, Yellow 4, and Yellow 5.", 4),
  new Task(2, "I will win Trump 3.", 1),
  // new Task("I will win most tricks.", 3),
  // new Task("I will win the first 3 tricks.", 4),
  // new Task("I will win the Green 9 with a Trump.", 3),
  // new Task("I will never win 2 tricks in a row.", 2),
  // new Task("I will win an equal and non-zero number of Yellow and Red.", 4),
  // new Task("I will win an equal number of Blue and Red in the same trick.", 3),
  // new Task("I will win Trump 2 and no other Trump.", 3),
  // new Task("I will win every card of at least 1 suit.", 5),
  // new Task("I will win exactly 3x Trump.", 4),
  // new Task("I will win fewer tricks than Commander.", 2),
  // new Task("I will not win any 9.", 1),
  // new Task(
  //   "I will win a trick with all cards less than 7 without using Trump.",
  //   3
  // ),
  // new Task("I will win a trick with a non-Trump 2.", 5),
  // new Task("I will win Green 6.", 1),
  // new Task("I will win at least 7x Yellow.", 3),
  // new Task("I will win at least 3x 5.", 5),
  // new Task("I will win an 8 with a non-Trump 4.", 5),
  // new Task("I will win Trump 3.", 1),
];
