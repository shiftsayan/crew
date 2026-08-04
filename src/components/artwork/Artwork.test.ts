import { describe, expect, it } from "vitest";

import {
  getArtworkAnimationPhase,
  getArtworkDensityVisibility,
  getArtworkDotRadius,
  getArtworkTintIntroOpacity,
  shouldSampleArtworkCharacter,
} from "./Artwork";
import {
  DEFAULT_ARTWORK_CHARACTERS,
  DEFAULT_ARTWORK_CONFIG,
} from "./config";

describe("Artwork's ASCII Magic-compatible model", () => {
  it("includes the Crew letters in the standard character ramp", () => {
    expect(DEFAULT_ARTWORK_CHARACTERS).toBe("@#S08Xxthecrew+=-;:. ");
  });

  it("uses the classic sampling cadence and threshold", () => {
    expect(DEFAULT_ARTWORK_CONFIG.effect).toMatchObject({
      samplingIntervalMs: 220,
      samplingThreshold: 0.6,
    });
    expect(shouldSampleArtworkCharacter(3, 4, 1, 0)).toBe(false);
    expect(shouldSampleArtworkCharacter(3, 4, 1, 1)).toBe(true);

    const sampledCells = Array.from({ length: 100 }, (_, index) =>
      shouldSampleArtworkCharacter(index % 10, Math.floor(index / 10), 1),
    ).filter(Boolean);
    expect(sampledCells.length).toBeGreaterThan(50);
    expect(sampledCells.length).toBeLessThan(70);
  });

  it("uses the fixed luminance-based dot sizing curve", () => {
    expect(getArtworkDotRadius(0, 10, 20)).toBeCloseTo(0.675);
    expect(getArtworkDotRadius(1, 10, 20)).toBeCloseTo(4.5);
    expect(getArtworkDotRadius(1, 10, 20, 90)).toBeCloseTo(4.05);
  });

  it("derives density feathering from the density value", () => {
    expect(getArtworkDensityVisibility(0, 30)).toBe(0);
    expect(getArtworkDensityVisibility(0.42, 30)).toBe(1);
    expect(getArtworkDensityVisibility(1, 30)).toBe(1);
  });

  it("uses directional and pulse phase presets", () => {
    const left = getArtworkAnimationPhase(0, 0, 10, 10, "cascade-lr", 0);
    const right = getArtworkAnimationPhase(9, 0, 10, 10, "cascade-lr", 0);
    const pulse = getArtworkAnimationPhase(9, 9, 10, 10, "pulse", 0);

    expect(left.phase).toBeGreaterThan(right.phase);
    expect(pulse.phase).toBe(0);
    expect(pulse.jitter).toBe(0);
  });

  it("blends deterministic random phase into animation randomness", () => {
    const ordered = getArtworkAnimationPhase(3, 4, 12, 8, "pulse", 0);
    const random = getArtworkAnimationPhase(3, 4, 12, 8, "pulse", 100);

    expect(ordered.phase).toBe(0);
    expect(random.phase).toBeGreaterThan(0);
    expect(random.phase).toBeLessThan(1);
  });

  it("animates a 50% grayscale tint to clear over 1.5 seconds", () => {
    expect(getArtworkTintIntroOpacity(0)).toBe(0.5);
    expect(getArtworkTintIntroOpacity(750)).toBeGreaterThan(0);
    expect(getArtworkTintIntroOpacity(1500)).toBe(0);
    expect(getArtworkTintIntroOpacity(0, true)).toBe(0);
  });
});
