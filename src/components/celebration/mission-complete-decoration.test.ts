import type canvasConfetti from "canvas-confetti";
import { describe, expect, it, vi } from "vitest";

import {
  MISSION_COMPLETE_COLORS,
  playMissionCompleteDecoration,
} from "./mission-complete-decoration";

function createConfetti() {
  const confetti = vi.fn(() => null) as unknown as typeof canvasConfetti;
  confetti.reset = vi.fn();
  return confetti;
}

describe("mission complete decoration", () => {
  it("plays the production cannons from both bottom corners", () => {
    const confetti = createConfetti();

    playMissionCompleteDecoration(confetti);

    expect(confetti).toHaveBeenCalledTimes(2);
    expect(vi.mocked(confetti).mock.calls.map(([settings]) => settings?.origin)).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
    for (const [settings] of vi.mocked(confetti).mock.calls) {
      expect(settings).toMatchObject({
        colors: [...MISSION_COMPLETE_COLORS],
        disableForReducedMotion: true,
        zIndex: 1000,
      });
    }
  });
});
