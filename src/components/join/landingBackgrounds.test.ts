import { describe, expect, it } from "vitest";

import { LANDING_BACKGROUNDS } from "./landingBackgrounds";

describe("landing background configuration", () => {
  it("contains uniquely identified, directly hotlinked Unsplash photos", () => {
    expect(LANDING_BACKGROUNDS.length).toBeGreaterThan(0);
    expect(new Set(LANDING_BACKGROUNDS.map(({ id }) => id)).size).toBe(
      LANDING_BACKGROUNDS.length,
    );

    for (const background of LANDING_BACKGROUNDS) {
      const imageUrl = new URL(background.imageUrl);
      const photographerUrl = new URL(background.photographerUrl);
      const photoUrl = new URL(background.photoUrl);

      expect(imageUrl.protocol).toBe("https:");
      expect(imageUrl.hostname).toBe("images.unsplash.com");
      const width = Number(imageUrl.searchParams.get("w"));
      const height = Number(imageUrl.searchParams.get("h"));
      expect(width).toBeGreaterThan(0);
      expect(width).toBeLessThanOrEqual(1200);
      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThanOrEqual(1200);
      expect(imageUrl.searchParams.get("fit")).toBe("max");
      expect(photographerUrl.hostname).toBe("unsplash.com");
      expect(photoUrl.hostname).toBe("unsplash.com");
      expect(photographerUrl.searchParams.get("utm_source")).toBe("crew");
      expect(photoUrl.searchParams.get("utm_source")).toBe("crew");
      expect(background.photographerName.length).toBeGreaterThan(0);
    }
  });

  it("keeps decorative rendering static and within bounded effect ranges", () => {
    for (const { effect } of LANDING_BACKGROUNDS) {
      expect(effect.fontSize).toBeGreaterThanOrEqual(6);
      expect(effect.fontSize).toBeLessThanOrEqual(20);
      expect(effect.options.animationStyle).toBe("none");
      expect(effect.options.hoverStrength).toBe(0);
      const ditherStrength =
        "ditherStrength" in effect.options
          ? effect.options.ditherStrength
          : undefined;
      if (ditherStrength !== undefined) {
        expect(ditherStrength).toBeGreaterThanOrEqual(0);
        expect(ditherStrength).toBeLessThanOrEqual(1);
      }
      expect(effect.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
