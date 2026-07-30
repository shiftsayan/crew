import { describe, expect, it } from "vitest";

import {
  CARD_IDS,
  DEEP_SEA_TASKS,
  NON_TRUMP_CARD_IDS,
  createSetupState,
  startAttempt,
  type GameState,
} from "@/game";
import { stateMatchesMissionConfig } from "@/server/rooms";

const players = ["player-1", "player-2", "player-3"];

function startedState(
  editionKey: "planet-nine" | "deep-sea",
  missionKey: `${"planet-nine" | "deep-sea"}:${number}`,
): GameState {
  const started = startAttempt(
    createSetupState({ editionKey, missionKey, attemptNumber: 1 }),
    {
      playerIds: players,
      deckOrder: [...CARD_IDS],
      taskOrder:
        editionKey === "planet-nine"
          ? [...NON_TRUMP_CARD_IDS]
          : DEEP_SEA_TASKS.map((task) => task.id),
    },
  );
  if (!started.ok) {
    throw new Error(started.error.message);
  }
  return started.state;
}

describe("stored mission configuration compatibility", () => {
  it("accepts current Planet Nine and Deep Sea snapshots", () => {
    expect(
      stateMatchesMissionConfig(startedState("planet-nine", "planet-nine:3")),
    ).toBe(true);
    expect(
      stateMatchesMissionConfig(startedState("deep-sea", "deep-sea:5")),
    ).toBe(true);
  });

  it("rejects stale Planet Nine objective references and order tokens", () => {
    const staleDefinition = structuredClone(
      startedState("planet-nine", "planet-nine:3"),
    );
    staleDefinition.tasks[0].definitionId = "planet-nine-card:blue-9";
    expect(stateMatchesMissionConfig(staleDefinition)).toBe(false);

    const staleOrder = structuredClone(
      startedState("planet-nine", "planet-nine:3"),
    );
    staleOrder.tasks[0].order = "last";
    expect(stateMatchesMissionConfig(staleOrder)).toBe(false);
  });

  it("rejects stale Deep Sea task references and difficulty budgets", () => {
    const staleReference = structuredClone(
      startedState("deep-sea", "deep-sea:5"),
    );
    staleReference.tasks[0].definitionId = "deep-sea-task-999";
    expect(stateMatchesMissionConfig(staleReference)).toBe(false);

    const staleDifficulty = structuredClone(
      startedState("deep-sea", "deep-sea:5"),
    );
    staleDifficulty.tasks[0].difficulty =
      (staleDifficulty.tasks[0].difficulty ?? 0) + 1;
    expect(stateMatchesMissionConfig(staleDifficulty)).toBe(false);
  });
});
