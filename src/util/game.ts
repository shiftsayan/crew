import { Suite } from "./enums";

export const suites = [
  Suite.Blue,
  Suite.Green,
  Suite.Red,
  Suite.Yellow,
  Suite.Black,
];
export const suitTrump = Suite.Black;

export const cards = [];
for (let suite of suites) {
  for (let num = 1; num <= (suite === suitTrump ? 4 : 9); num++) {
    cards.push({ num: num, suite: suite });
  }
}
