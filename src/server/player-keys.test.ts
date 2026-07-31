import { describe, expect, it } from "vitest";

import {
  PLAYER_KEY_PATTERN,
  ROOM_KEY_PATTERN,
  generatePlayerKey,
  generateRoomKey,
  normalizePlayerKey,
  normalizeRoomKey,
} from "@/server/player-keys";

describe("player keys", () => {
  it("generates six unambiguous characters", () => {
    for (let count = 0; count < 100; count += 1) {
      expect(generatePlayerKey()).toMatch(PLAYER_KEY_PATTERN);
    }
  });

  it("normalizes pasted keys", () => {
    expect(normalizePlayerKey(" ab2cde ")).toBe("AB2CDE");
    expect(normalizeRoomKey(" fgh3jk ")).toBe("FGH3JK");
  });

  it("uses the same unambiguous format for room keys", () => {
    expect(generateRoomKey()).toMatch(ROOM_KEY_PATTERN);
  });
});
