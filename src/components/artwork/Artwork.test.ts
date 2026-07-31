import { describe, expect, test } from "vitest";

import {
  DEFAULT_ARTWORK_CHARACTERS,
  getCoverSourceRect,
  getArtworkVisibility,
  selectArtworkCharacter,
  shouldSampleArtworkCharacter,
} from "./Artwork";

describe("Artwork", () => {
  test("center-crops wide artwork for a portrait container", () => {
    const crop = getCoverSourceRect(1672, 941, 375 / 812);

    expect(crop.height).toBe(941);
    expect(crop.width).toBeCloseTo(434.54, 1);
    expect(crop.x).toBeCloseTo((1672 - crop.width) / 2, 5);
    expect(crop.y).toBe(0);
  });

  test("alternates nearby-density characters over time", () => {
    const characters = "@#S08Xx+=-;:.";
    const firstFrame = Array.from({ length: 32 }, (_, column) =>
      selectArtworkCharacter(characters, 0.45, column, 2, 0),
    );
    const secondFrame = Array.from({ length: 32 }, (_, column) =>
      selectArtworkCharacter(characters, 0.45, column, 2, 1),
    );

    expect(secondFrame).not.toEqual(firstFrame);
    for (let index = 0; index < firstFrame.length; index += 1) {
      expect(
        Math.abs(
          characters.indexOf(firstFrame[index]) -
            characters.indexOf(secondFrame[index]),
        ),
      ).toBeLessThanOrEqual(2);
    }
  });

  test("masks dark sky while feathering characters into bright clouds", () => {
    expect(getArtworkVisibility(0.08)).toBe(0);
    expect(getArtworkVisibility(0.36)).toBe(0);
    expect(getArtworkVisibility(0.46)).toBeCloseTo(0.5, 5);
    expect(getArtworkVisibility(0.56)).toBe(1);
    expect(getArtworkVisibility(0.9)).toBe(1);
  });

  test("includes thecrew in the default character ramp", () => {
    expect(DEFAULT_ARTWORK_CHARACTERS).toContain("thecrew");
  });

  test("resamples approximately sixty percent of characters per frame", () => {
    const sampledCells = Array.from({ length: 10_000 }, (_, index) =>
      shouldSampleArtworkCharacter(index % 100, Math.floor(index / 100), 3),
    ).filter(Boolean);

    expect(sampledCells.length / 10_000).toBeGreaterThan(0.58);
    expect(sampledCells.length / 10_000).toBeLessThan(0.62);
    expect(shouldSampleArtworkCharacter(2, 4, 1, 0)).toBe(false);
    expect(shouldSampleArtworkCharacter(2, 4, 1, 1)).toBe(true);
  });
});
