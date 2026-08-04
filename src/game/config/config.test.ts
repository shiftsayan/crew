import { describe, expect, it } from "vitest";
import {
  CARD_DECK,
  CARD_IDS,
  DEEP_SEA_MISSIONS,
  DEEP_SEA_TASKS,
  PLANET_NINE_MISSIONS,
  getNextMission,
  validateGameConfig,
} from ".";

describe("game configuration", () => {
  it("defines the canonical 40-card deck", () => {
    expect(CARD_DECK).toHaveLength(40);
    expect(new Set(CARD_IDS)).toHaveLength(40);
    expect(CARD_DECK.filter((card) => card.suit === "trump")).toHaveLength(4);
    for (const suit of ["blue", "green", "pink", "yellow"]) {
      expect(CARD_DECK.filter((card) => card.suit === suit)).toHaveLength(9);
    }
  });

  it("preserves only the 96 legitimate Deep Sea tasks", () => {
    expect(DEEP_SEA_TASKS).toHaveLength(96);
    expect(DEEP_SEA_TASKS.map((task) => task.number)).toEqual(
      Array.from({ length: 96 }, (_, index) => index + 1),
    );
    expect(DEEP_SEA_TASKS.some((task) => task.number === 1000)).toBe(false);
    expect(DEEP_SEA_TASKS[1].title).toContain("Pink");
    expect(
      DEEP_SEA_TASKS.map((task) => task.presentation.visual.kind).filter(
        (kind) => kind === "text",
      ),
    ).toHaveLength(45);
    expect(
      DEEP_SEA_TASKS.map((task) => task.presentation.visual.kind).filter(
        (kind) => kind === "header",
      ),
    ).toHaveLength(34);
    expect(
      DEEP_SEA_TASKS.map((task) => task.presentation.visual.kind).filter(
        (kind) => kind === "cards",
      ),
    ).toHaveLength(17);
  });

  it("exposes exactly the supported sparse mission lists", () => {
    expect(PLANET_NINE_MISSIONS.map((mission) => mission.number)).toEqual([
      1, 2, 3, 4, 6, 7, 8, 10, 14, 15, 21, 47, 48, 49,
    ]);
    expect(DEEP_SEA_MISSIONS.map((mission) => mission.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      26, 27, 28, 29, 30, 31, 32,
    ]);
  });

  it("advances through explicit mission order instead of numeric increments", () => {
    expect(getNextMission("planet-nine", "planet-nine:4")?.key).toBe(
      "planet-nine:6",
    );
    expect(getNextMission("deep-sea", "deep-sea:11")?.key).toBe(
      "deep-sea:17",
    );
    expect(getNextMission("deep-sea", "deep-sea:32")).toBeNull();
  });

  it("passes all cross-configuration checks", () => {
    expect(validateGameConfig()).toEqual([]);
  });

  it("preserves exact Planet Nine order and communication metadata", () => {
    expect(
      PLANET_NINE_MISSIONS.map(
        ({ number, taskCount, orderTokens, deadSpot }) => ({
          number,
          taskCount,
          orderTokens,
          deadSpot,
        }),
      ),
    ).toEqual([
      { number: 1, taskCount: 1, orderTokens: [], deadSpot: false },
      { number: 2, taskCount: 2, orderTokens: [], deadSpot: false },
      { number: 3, taskCount: 2, orderTokens: ["one", "two"], deadSpot: false },
      { number: 4, taskCount: 3, orderTokens: [], deadSpot: false },
      { number: 6, taskCount: 3, orderTokens: ["first", "second"], deadSpot: true },
      { number: 7, taskCount: 1, orderTokens: ["last"], deadSpot: false },
      {
        number: 8,
        taskCount: 3,
        orderTokens: ["one", "two", "three"],
        deadSpot: false,
      },
      { number: 10, taskCount: 4, orderTokens: [], deadSpot: false },
      {
        number: 14,
        taskCount: 4,
        orderTokens: ["first", "second", "third"],
        deadSpot: false,
      },
      {
        number: 15,
        taskCount: 4,
        orderTokens: ["one", "two", "three", "four"],
        deadSpot: false,
      },
      { number: 21, taskCount: 5, orderTokens: ["one", "two"], deadSpot: true },
      { number: 47, taskCount: 10, orderTokens: [], deadSpot: false },
      { number: 48, taskCount: 3, orderTokens: ["last-trick"], deadSpot: false },
      {
        number: 49,
        taskCount: 10,
        orderTokens: ["first", "second", "third"],
        deadSpot: false,
      },
    ]);
  });
});
