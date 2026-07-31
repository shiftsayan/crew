import { describe, expect, test } from "vitest";

import {
  getCoverSourceRect,
  selectArtworkCharacter,
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
});
