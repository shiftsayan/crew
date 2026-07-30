import { describe, expect, it } from "vitest";

import {
  PLAYER_KEY_PATTERN,
  generatePlayerKey,
  normalizePlayerKey,
} from "@/server/player-keys";

describe("player keys", () => {
  it("generates six unambiguous characters", () => {
    for (let count = 0; count < 100; count += 1) {
      expect(generatePlayerKey()).toMatch(PLAYER_KEY_PATTERN);
    }
  });

  it("normalizes pasted keys", () => {
    expect(normalizePlayerKey(" ab2cde ")).toBe("AB2CDE");
  });
});
