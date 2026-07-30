import { z } from "zod";

import type {
  EditionKey,
  MissionKey,
  PlayerCount,
  TaskOrder,
} from "../contracts";
import {
  CardSchema,
  EditionKeySchema,
  MissionKeySchema,
  TaskOrderSchema,
} from "../contracts";
import { CARD_DECK } from "./cards";
import { DEEP_SEA_TASKS } from "./deep-sea-tasks";

type MissionBase = {
  key: MissionKey;
  editionKey: EditionKey;
  number: number;
  title: string;
  manualRule: true;
  deadSpot: boolean;
};

export type PlanetNineMissionDefinition = MissionBase & {
  editionKey: "planet-nine";
  taskCount: number;
  orderTokens: readonly TaskOrder[];
  allowsManualMissionOutcome: false;
};

export type DeepSeaMissionDefinition = MissionBase & {
  editionKey: "deep-sea";
  taskBudget: number;
  allowsManualMissionOutcome: boolean;
};

export type MissionDefinition =
  | PlanetNineMissionDefinition
  | DeepSeaMissionDefinition;

export type EditionDefinition = {
  key: EditionKey;
  title: string;
  missionKeys: readonly MissionKey[];
};

function planetNineMission(
  number: number,
  taskCount: number,
  orderTokens: readonly TaskOrder[] = [],
  deadSpot = false,
): PlanetNineMissionDefinition {
  return {
    key: `planet-nine:${number}` as MissionKey,
    editionKey: "planet-nine",
    number,
    title: `Mission ${number}`,
    manualRule: true,
    deadSpot,
    taskCount,
    orderTokens,
    allowsManualMissionOutcome: false,
  };
}

function deepSeaMission(
  number: number,
  taskBudget: number,
): DeepSeaMissionDefinition {
  return {
    key: `deep-sea:${number}` as MissionKey,
    editionKey: "deep-sea",
    number,
    title: `Mission ${number}`,
    manualRule: true,
    deadSpot: false,
    taskBudget,
    allowsManualMissionOutcome: taskBudget === 0,
  };
}

export const PLANET_NINE_MISSIONS = [
  planetNineMission(1, 1),
  planetNineMission(2, 2),
  planetNineMission(3, 2, ["one", "two"]),
  planetNineMission(4, 3),
  planetNineMission(6, 3, ["first", "second"], true),
  planetNineMission(7, 1, ["last"]),
  planetNineMission(8, 3, ["one", "two", "three"]),
  planetNineMission(10, 4),
  planetNineMission(14, 4, ["first", "second", "third"]),
  planetNineMission(15, 4, ["one", "two", "three", "four"]),
  planetNineMission(21, 5, ["one", "two"], true),
  planetNineMission(47, 10),
  planetNineMission(48, 3, ["last-trick"]),
  planetNineMission(49, 10, ["first", "second", "third"]),
] as const satisfies readonly PlanetNineMissionDefinition[];

export const DEEP_SEA_MISSIONS = [
  deepSeaMission(1, 1),
  deepSeaMission(2, 2),
  deepSeaMission(3, 3),
  deepSeaMission(4, 4),
  deepSeaMission(5, 5),
  deepSeaMission(6, 5),
  deepSeaMission(7, 6),
  deepSeaMission(8, 0),
  deepSeaMission(9, 7),
  deepSeaMission(10, 4),
  deepSeaMission(11, 8),
  deepSeaMission(17, 9),
  deepSeaMission(18, 9),
  deepSeaMission(19, 9),
  deepSeaMission(20, 10),
  deepSeaMission(21, 0),
  deepSeaMission(22, 11),
  deepSeaMission(23, 0),
  deepSeaMission(24, 12),
  deepSeaMission(25, 12),
  deepSeaMission(26, 10),
  deepSeaMission(27, 0),
  deepSeaMission(28, 14),
  deepSeaMission(29, 14),
  deepSeaMission(30, 16),
  deepSeaMission(31, 17),
  deepSeaMission(32, 18),
] as const satisfies readonly DeepSeaMissionDefinition[];

export const MISSIONS: readonly MissionDefinition[] = Object.freeze([
  ...PLANET_NINE_MISSIONS,
  ...DEEP_SEA_MISSIONS,
]);

const missionsByKey = new Map(MISSIONS.map((mission) => [mission.key, mission]));

export const EDITIONS: readonly EditionDefinition[] = Object.freeze([
  {
    key: "planet-nine",
    title: "The Crew: The Quest for Planet Nine",
    missionKeys: PLANET_NINE_MISSIONS.map((mission) => mission.key),
  },
  {
    key: "deep-sea",
    title: "The Crew: Mission Deep Sea",
    missionKeys: DEEP_SEA_MISSIONS.map((mission) => mission.key),
  },
]);

export function getMission(
  editionKey: EditionKey,
  missionKey: MissionKey,
): MissionDefinition {
  const mission = missionsByKey.get(missionKey);
  if (!mission || mission.editionKey !== editionKey) {
    throw new Error(`Unknown ${editionKey} mission: ${missionKey}`);
  }
  return mission;
}

export function getNextMission(
  editionKey: EditionKey,
  missionKey: MissionKey,
): MissionDefinition | null {
  const edition = EDITIONS.find((candidate) => candidate.key === editionKey);
  if (!edition) {
    return null;
  }
  const index = edition.missionKeys.indexOf(missionKey);
  if (index < 0 || index === edition.missionKeys.length - 1) {
    return null;
  }
  return getMission(editionKey, edition.missionKeys[index + 1]);
}

function canMakeBudget(
  budget: number,
  playerCount: PlayerCount,
  startIndex = 0,
): boolean {
  if (budget === 0) {
    return true;
  }
  for (let index = startIndex; index < DEEP_SEA_TASKS.length; index += 1) {
    const difficulty = DEEP_SEA_TASKS[index].difficulty[playerCount];
    if (
      difficulty <= budget &&
      canMakeBudget(budget - difficulty, playerCount, index + 1)
    ) {
      return true;
    }
  }
  return false;
}

export function validateGameConfig(): string[] {
  const issues: string[] = [];
  const schemaResult = GameConfigSchema.safeParse({
    cards: CARD_DECK,
    deepSeaTasks: DEEP_SEA_TASKS,
    missions: MISSIONS,
    editions: EDITIONS,
  });
  if (!schemaResult.success) {
    issues.push(
      ...schemaResult.error.issues.map(
        (issue) =>
          `${issue.path.join(".") || "config"}: ${issue.message}`,
      ),
    );
  }

  const cardIds = new Set(CARD_DECK.map((card) => card.id));
  if (CARD_DECK.length !== 40 || cardIds.size !== CARD_DECK.length) {
    issues.push("The card deck must contain 40 unique cards.");
  }

  const cardTaskNumbers = new Set(DEEP_SEA_TASKS.map((task) => task.number));
  const taskIds = new Set(DEEP_SEA_TASKS.map((task) => task.id));

  if (DEEP_SEA_TASKS.length !== 96) {
    issues.push(`Expected 96 Deep Sea tasks; found ${DEEP_SEA_TASKS.length}.`);
  }
  if (cardTaskNumbers.size !== DEEP_SEA_TASKS.length) {
    issues.push("Deep Sea task numbers must be unique.");
  }
  if (taskIds.size !== DEEP_SEA_TASKS.length) {
    issues.push("Deep Sea task IDs must be unique.");
  }
  if (cardTaskNumbers.has(1000)) {
    issues.push("Placeholder Deep Sea task 1000 must not be present.");
  }
  for (const task of DEEP_SEA_TASKS) {
    if (
      task.title !== task.presentation.summary ||
      task.presentation.summary.trim().length === 0
    ) {
      issues.push(`${task.id} has no renderable presentation.`);
    }
  }

  const missionKeys = new Set(MISSIONS.map((mission) => mission.key));
  if (missionKeys.size !== MISSIONS.length) {
    issues.push("Mission keys must be unique.");
  }

  for (const mission of PLANET_NINE_MISSIONS) {
    if (mission.orderTokens.length > mission.taskCount) {
      issues.push(`${mission.key} has more order tokens than tasks.`);
    }
  }

  const referencedMissionKeys = EDITIONS.flatMap((edition) =>
    edition.missionKeys.map((missionKey) => `${edition.key}/${missionKey}`),
  );
  const expectedMissionReferences = MISSIONS.map(
    (mission) => `${mission.editionKey}/${mission.key}`,
  );
  if (
    referencedMissionKeys.length !== expectedMissionReferences.length ||
    new Set(referencedMissionKeys).size !== referencedMissionKeys.length ||
    expectedMissionReferences.some(
      (reference) => !referencedMissionKeys.includes(reference),
    )
  ) {
    issues.push("Every mission must be referenced exactly once by its edition.");
  }

  for (const mission of DEEP_SEA_MISSIONS) {
    for (const playerCount of [3, 4, 5] as const) {
      if (!canMakeBudget(mission.taskBudget, playerCount)) {
        issues.push(
          `${mission.key} has no exact task selection for ${playerCount} players.`,
        );
      }
    }
  }

  return issues;
}

const DifficultyMapSchema = z.strictObject({
  3: z.number().int().positive(),
  4: z.number().int().positive(),
  5: z.number().int().positive(),
});

const DeepSeaTaskDefinitionSchema = z.strictObject({
  id: z.string().regex(/^deep-sea-task-(?:[1-9]|[1-8]\d|9[0-6])$/),
  number: z.number().int().min(1).max(96),
  title: z.string().trim().min(1),
  difficulty: DifficultyMapSchema,
  presentation: z.strictObject({
    summary: z.string().trim().min(1),
    footnote: z.string().trim().min(1).optional(),
  }),
});

const PlanetNineMissionDefinitionSchema = z.strictObject({
  key: MissionKeySchema,
  editionKey: z.literal("planet-nine"),
  number: z.number().int().positive(),
  title: z.string().trim().min(1),
  manualRule: z.literal(true),
  deadSpot: z.boolean(),
  taskCount: z.number().int().positive().max(36),
  orderTokens: z.array(TaskOrderSchema),
  allowsManualMissionOutcome: z.literal(false),
});

const DeepSeaMissionDefinitionSchema = z.strictObject({
  key: MissionKeySchema,
  editionKey: z.literal("deep-sea"),
  number: z.number().int().positive(),
  title: z.string().trim().min(1),
  manualRule: z.literal(true),
  deadSpot: z.literal(false),
  taskBudget: z.number().int().nonnegative(),
  allowsManualMissionOutcome: z.boolean(),
});

const GameConfigSchema = z.strictObject({
  cards: z.array(CardSchema).length(40),
  deepSeaTasks: z.array(DeepSeaTaskDefinitionSchema).length(96),
  missions: z.array(
    z.discriminatedUnion("editionKey", [
      PlanetNineMissionDefinitionSchema,
      DeepSeaMissionDefinitionSchema,
    ]),
  ),
  editions: z.array(
    z.strictObject({
      key: EditionKeySchema,
      title: z.string().trim().min(1),
      missionKeys: z.array(MissionKeySchema).min(1),
    }),
  ),
});
