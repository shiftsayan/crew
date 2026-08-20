import { describe, expect, it } from "vitest";

import {
  DEFAULT_HALFTONE_CONFIG,
  getHalftoneCellSize,
  getHalftonePlaybackState,
  hexToRgbUnit,
  normalizeHalftoneConfig,
} from "./HalftoneArtwork";
import { rotateGridPointToCanvas } from "./halftone-canvas2d";

describe("HalftoneArtwork's public model", () => {
  it("matches the inspected Halftone Swirl defaults", () => {
    expect(DEFAULT_HALFTONE_CONFIG).toEqual({
      background: "#200452",
      colorA: "#1580ed",
      colorB: "#3d0b59",
      dotDensity: 100,
      patternAngle: 45,
      colorBalance: 50,
      swirlDetail: 1,
      animationSpeed: 1,
    });
  });

  it("clamps editor values to the reference control ranges", () => {
    expect(
      normalizeHalftoneConfig({
        dotDensity: 400,
        patternAngle: -20,
        colorBalance: 140,
        swirlDetail: -1,
        animationSpeed: Number.POSITIVE_INFINITY,
      }),
    ).toMatchObject({
      dotDensity: 300,
      patternAngle: 0,
      colorBalance: 100,
      swirlDetail: 0,
      animationSpeed: 1,
    });
  });

  it("normalizes usable CSS colors and rejects malformed ones", () => {
    expect(
      normalizeHalftoneConfig({
        background: "ABC",
        colorA: "#12ef90",
        colorB: "violet",
      }),
    ).toMatchObject({
      background: "#aabbcc",
      colorA: "#12ef90",
      colorB: DEFAULT_HALFTONE_CONFIG.colorB,
    });
    expect(hexToRgbUnit("#ff8000")).toEqual([1, 128 / 255, 0]);
  });

  it("maps density to the observed CSS-pixel lattice size", () => {
    expect(getHalftoneCellSize(1420, 800, 100)).toBe(8);
    expect(getHalftoneCellSize(400, 800, 200)).toBe(2);
  });

  it("reports playback consistently for canvas and animated fallbacks", () => {
    expect(getHalftonePlaybackState(false, 1, false)).toBe("running");
    expect(getHalftonePlaybackState(true, 1, false)).toBe("paused");
    expect(getHalftonePlaybackState(false, 0, false)).toBe("paused");
    expect(getHalftonePlaybackState(false, 1, true)).toBe("reduced-motion");
  });

  it("maps the 2D lattice from WebGL's bottom-origin coordinates", () => {
    const angle = Math.PI / 6;
    const point = rotateGridPointToCanvas(
      100,
      50,
      600,
      Math.sin(angle),
      Math.cos(angle),
    );

    expect(point.x).toBeCloseTo(61.6025, 4);
    expect(point.y).toBeCloseTo(506.6987, 4);
  });
});
