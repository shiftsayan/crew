import { Suite } from "./enums";

export const SUITES = [
  Suite.Blue,
  Suite.Green,
  Suite.Red,
  Suite.Yellow,
  Suite.Black,
];
export const SUIT_TRUMP = Suite.Black;

export const CARDS = [];
for (let suite of SUITES) {
  for (let num = 1; num <= (suite === SUIT_TRUMP ? 4 : 9); num++) {
    CARDS.push({ num: num, suite: suite });
  }
}
