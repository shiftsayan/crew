import type { PlayerCount } from "../contracts";
import {
  DEEP_SEA_TASK_VISUALS,
  type DeepSeaTaskVisual,
} from "./deep-sea-task-visuals";

export type {
  DeepSeaTaskVisual,
  DeepSeaTaskVisualItem,
} from "./deep-sea-task-visuals";

export type DeepSeaTaskId = `deep-sea-task-${number}`;

export type DeepSeaTaskDefinition = {
  id: DeepSeaTaskId;
  number: number;
  title: string;
  difficulty: Record<PlayerCount, number>;
  presentation: {
    summary: string;
    footnote?: string;
    visual: DeepSeaTaskVisual;
  };
};

type RawTask = readonly [
  number,
  string,
  readonly [number, number, number],
  string?,
];

// The task text and player-count difficulty values are the normalized, legitimate
// 1-96 records from the legacy application. Outcomes intentionally remain manual.
const RAW_DEEP_SEA_TASKS: readonly RawTask[] = [
  [1, "I will win a trick using a 5", [2, 3, 4]],
  [2, "I will win exactly one Green and one Pink card", [4, 4, 4]],
  [3, "I will win more Pink than Green cards", [1, 1, 1]],
  [4, "I will win exactly X tricks (X is public)", [3, 2, 2]],
  [5, "I will win a trick using a 2", [3, 4, 5]],
  [6, "I will win no 5", [1, 2, 2]],
  [7, "I will win at least two 7s", [2, 2, 2]],
  [8, "I will win the first 2 tricks", [1, 1, 2]],
  [9, "I will win all four 9s", [4, 5, 6]],
  [10, "I will win the Pink 9 and Yellow 8", [2, 3, 3]],
  [11, "I will win more tricks than everyone else combined", [3, 4, 5]],
  [12, "I will win the Pink 5 and Yellow 6", [2, 2, 3]],
  [13, "I will win exactly X tricks (X is private)", [4, 3, 3]],
  [14, "I will win exactly one trick", [3, 2, 2]],
  [15, "I will win the Green 5 and Blue 8", [2, 2, 3]],
  [16, "I will win exactly three 6s", [3, 4, 4]],
  [17, "I will not open a trick with Pink or Green", [2, 1, 1]],
  [18, "I will win none of the first four tricks", [1, 2, 3]],
  [
    19,
    "I will win a trick that contains only even numbered cards",
    [2, 5, 6],
  ],
  [20, "I will win the Yellow 7 and Blue 7", [2, 3, 3]],
  [
    21,
    "I will win as many Pink as Yellow cards",
    [4, 4, 4],
    "Zero Pink and Yellow cards is not allowed.",
  ],
  [22, "I will win 2 tricks in a row", [1, 1, 1]],
  [
    23,
    "I will win the Blue 3, Pink 3, Yellow 3 and Green 3",
    [3, 4, 5],
  ],
  [
    24,
    "I will win a trick whose card values are all greater than 5",
    [2, 3, 4],
  ],
  [25, "I will win exactly one Pink", [3, 3, 4]],
  [26, "I will win no Yellow or Green cards", [3, 3, 3]],
  [27, "I will win a trick using a 6", [2, 3, 3]],
  [28, "I will win fewer tricks than anyone else", [2, 2, 3]],
  [29, "I will never win two tricks in a row", [3, 2, 2]],
  [30, "I will win a trick using a 3", [3, 4, 5]],
  [31, "I will win exactly four tricks", [2, 3, 5]],
  [
    32,
    "I will win exactly two tricks and they will be in a row",
    [3, 3, 3],
  ],
  [33, "I will win the Green 2 in the final trick of the game", [3, 4, 5]],
  [
    34,
    "I will win a trick with total value greater than 23 (3 players), 28 (4 players), or 31 (5 players)",
    [3, 3, 4],
    "Submarines are not allowed in the trick.",
  ],
  [35, "I will win none of the first five tricks", [2, 3, 3]],
  [36, "I will win no Pink cards", [2, 2, 2]],
  [
    37,
    "I will win exactly three submarines",
    [3, 4, 4],
    "If submarine cards 1, 2, 3, and 4 are in one hand, redeal.",
  ],
  [38, "I will win the Green 3, Yellow 4, and Yellow 5", [3, 4, 4]],
  [39, "I will win only the last trick", [4, 4, 4]],
  [
    40,
    "I will win a trick whose card values are all less than 7",
    [2, 3, 3],
    "Submarines are not allowed in the trick.",
  ],
  [41, "I will win the Blue 1, Blue 2, and Blue 3", [2, 3, 3]],
  [
    42,
    "I will win a trick with total value less than 8 (3 players), 12 (4 players), or 16 (5 players)",
    [3, 3, 4],
    "Submarines are not allowed in the trick.",
  ],
  [43, "I will win at least three 9s", [3, 4, 5]],
  [44, "I will win the Pink 7 with a submarine", [3, 3, 3]],
  [45, "I will win no Pink or Blue cards", [3, 3, 3]],
  [46, "I will win the Pink 3", [1, 1, 1]],
  [47, "I will win at least three 5s", [3, 4, 5]],
  [48, "I will win no 1s", [2, 2, 2]],
  [
    49,
    "I will win a trick with a total value of 22 or 33",
    [3, 3, 4],
    "Submarines are not allowed in the trick.",
  ],
  [50, "I will win the Pink 8 and Blue 5", [2, 2, 3]],
  [51, "I will win zero tricks", [4, 3, 3]],
  [
    52,
    "I will win submarine 1 and no other submarines",
    [3, 3, 3],
    "If submarines 1 and 4, or submarines 1, 2, and 3, are in one hand, redeal.",
  ],
  [53, "I will win the Green 9 with a submarine", [3, 3, 3]],
  [
    54,
    "I will win fewer tricks than the captain",
    [2, 2, 2],
    "I am not the captain.",
  ],
  [55, "I will win exactly two Blue cards", [3, 4, 4]],
  [56, "I will win the first trick", [1, 1, 1]],
  [57, "I will win the first and the last trick", [3, 4, 4]],
  [
    58,
    "I will win exactly three tricks and they will be in a row",
    [3, 3, 4],
  ],
  [59, "I will win more tricks than anyone else", [2, 3, 3]],
  [
    60,
    "I will win more tricks than the captain",
    [2, 2, 3],
    "I am not the captain.",
  ],
  [61, "I will win exactly two Green cards", [3, 4, 4]],
  [
    62,
    "I will win submarine 2 and no other submarine",
    [3, 3, 3],
    "If submarines 2 and 4, or submarines 1, 2, and 3, are in one hand, redeal.",
  ],
  [
    63,
    "I will win exactly two submarines",
    [3, 3, 4],
    "If submarines 2, 3, and 4 are in one hand, redeal.",
  ],
  [
    64,
    "I will win more Yellow than Blue cards",
    [1, 1, 1],
    "Winning zero Blue cards is allowed.",
  ],
  [65, "I will win a 6 with another 6", [2, 3, 4]],
  [66, "I will win submarine 3", [1, 1, 1]],
  [
    67,
    "I will win as many Pink as Blue cards in one trick",
    [2, 3, 3],
    "Zero Pink and Blue cards is not allowed.",
  ],
  [68, "I will win at least seven Yellow cards", [3, 3, 3]],
  [69, "I will win an 8 with a 4", [3, 4, 5]],
  [70, "I will win no 1s, 2s, or 3s", [3, 3, 3]],
  [71, "I will win no 8s or 9s", [3, 3, 2]],
  [72, "I will win only the first trick", [4, 3, 3]],
  [73, "I will win no Green cards", [2, 2, 2]],
  [74, "I will win the Yellow 1", [1, 1, 1]],
  [75, "I will win the Blue 6 and Yellow 7", [2, 2, 3]],
  [76, "I will win at least five Pink cards", [2, 3, 3]],
  [77, "I will win none of the first three tricks", [1, 2, 2]],
  [78, "I will win a 5 with a 7", [1, 2, 2]],
  [
    79,
    "I will win as many tricks as the captain",
    [4, 3, 3],
    "I am not the captain.",
  ],
  [80, "I will win no Yellow cards", [2, 2, 2]],
  [
    81,
    "I will win as many Green as Yellow cards in one trick",
    [2, 3, 3],
    "Zero Green and Yellow cards is not allowed.",
  ],
  [82, "I will win the last trick", [2, 3, 3]],
  [83, "I will win no 9s", [1, 1, 1]],
  [84, "I will win the Green 6", [1, 1, 1]],
  [85, "I will win exactly two 9s", [2, 3, 3]],
  [86, "I will win the Pink 1 and Green 7", [2, 2, 2]],
  [87, "I will win the Blue 4", [1, 1, 1]],
  [
    88,
    "I will win exactly one submarine",
    [3, 3, 3],
    "If submarines 1, 2, 3, and 4 are in one hand, redeal.",
  ],
  [89, "I will not open a trick with Yellow, Pink, or Blue", [4, 3, 3]],
  [90, "I will win no submarines", [1, 1, 1]],
  [91, "I will win exactly two tricks", [2, 2, 2]],
  [
    92,
    "I will win all the cards in at least one of the four colors",
    [3, 4, 5],
  ],
  [93, "I will win at least one card of each color", [2, 3, 4]],
  [94, "I will win the first three tricks", [2, 3, 4]],
  [95, "I will win three tricks in a row", [2, 3, 4]],
  [
    96,
    "I will win a trick that contains only odd-numbered cards",
    [2, 4, 5],
  ],
];

export const DEEP_SEA_TASKS: readonly DeepSeaTaskDefinition[] = Object.freeze(
  RAW_DEEP_SEA_TASKS.map(([number, title, difficulty, footnote], index) => ({
    id: `deep-sea-task-${number}` as DeepSeaTaskId,
    number,
    title,
    difficulty: {
      3: difficulty[0],
      4: difficulty[1],
      5: difficulty[2],
    },
    presentation: {
      summary: title,
      visual: DEEP_SEA_TASK_VISUALS[index],
      ...(footnote ? { footnote } : {}),
    },
  })),
);

const tasksById = new Map(DEEP_SEA_TASKS.map((task) => [task.id, task]));

export function getDeepSeaTask(taskId: string): DeepSeaTaskDefinition {
  const task = findDeepSeaTask(taskId);
  if (!task) {
    throw new Error(`Unknown Deep Sea task: ${taskId}`);
  }
  return task;
}

export function findDeepSeaTask(
  taskId: string,
): DeepSeaTaskDefinition | null {
  return tasksById.get(taskId as DeepSeaTaskId) ?? null;
}
