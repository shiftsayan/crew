import type { ArtStyle, AsciiOptions } from "asciify-engine";

type LandingEffectOptions = Partial<
  Pick<
    AsciiOptions,
    | "accentColor"
    | "animationStyle"
    | "brightness"
    | "charset"
    | "colorMode"
    | "contrast"
    | "ditherStrength"
    | "dotSizeRatio"
    | "hoverStrength"
    | "invert"
    | "normalize"
    | "renderMode"
  >
>;

export type LandingBackground = {
  id: string;
  imageUrl: string;
  objectPosition: string;
  photographerName: string;
  photographerUrl: string;
  photoUrl: string;
  effect: {
    artStyle: ArtStyle;
    backgroundColor: string;
    fontSize: number;
    options: LandingEffectOptions;
  };
};

export const LANDING_BACKGROUND_SESSION_KEY = "crew:landing-background";

/**
 * Add or remove Unsplash photos here. One entry is chosen per browser tab and
 * kept stable in sessionStorage. Use direct images.unsplash.com URLs so the
 * original photo remains hotlinked, and keep the photographer/photo links for
 * visible attribution.
 */
export const LANDING_BACKGROUNDS = [
  {
    id: "maroon-stars",
    imageUrl:
      "https://images.unsplash.com/photo-1537147347432-676815edd56c?auto=format&fit=max&fm=jpg&h=1200&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=78&w=1200",
    objectPosition: "50% 48%",
    photographerName: "Matt Gross",
    photographerUrl:
      "https://unsplash.com/@mattkgross?utm_source=crew&utm_medium=referral",
    photoUrl:
      "https://unsplash.com/photos/purple-galaxy-wallpaper-uPa8mFbySYw?utm_source=crew&utm_medium=referral",
    effect: {
      artStyle: "ascii",
      backgroundColor: "#312e81",
      fontSize: 11,
      options: {
        accentColor: "#e0e7ff",
        animationStyle: "none",
        brightness: -0.04,
        charset: " .,:;i1tfLCG08@",
        colorMode: "accent",
        contrast: 0.18,
        ditherStrength: 0.68,
        hoverStrength: 0,
        invert: false,
        normalize: true,
        renderMode: "ascii",
      },
    },
  },
  {
    id: "imaginarium",
    imageUrl:
      "https://images.unsplash.com/photo-1677029907981-e9a44fb7409a?auto=format&fit=max&fm=jpg&h=1200&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=78&w=1200",
    objectPosition: "50% 50%",
    photographerName: "Aron Visuals",
    photographerUrl:
      "https://unsplash.com/@aronvisuals?utm_source=crew&utm_medium=referral",
    photoUrl:
      "https://unsplash.com/photos/a-purple-and-blue-space-filled-with-stars-NYwZhS4afQc?utm_source=crew&utm_medium=referral",
    effect: {
      artStyle: "particles",
      backgroundColor: "#3730a3",
      fontSize: 10,
      options: {
        accentColor: "#f0abfc",
        animationStyle: "none",
        brightness: -0.08,
        colorMode: "accent",
        contrast: 0.22,
        dotSizeRatio: 0.72,
        hoverStrength: 0,
        invert: false,
        normalize: true,
        renderMode: "dots",
      },
    },
  },
] as const satisfies readonly LandingBackground[];
