export const ARTWORK_CHARACTER_SETS = {
  standard: "@#S08Xxthecrew+=-;:. ",
  detailed: "█▓▒░⣿⣷⣯⣟⡿⢿⣻⣽⣾⣷⣦⣄⣆⡆⠆ ",
  minimal: "█▄▀ ",
} as const;

export const DEFAULT_ARTWORK_SAMPLING_INTERVAL_MS = 220;
export const DEFAULT_ARTWORK_SAMPLING_THRESHOLD = 0.6;

export const ARTWORK_EFFECT_BLEND_MODES = [
  "source-over",
  "overlay",
  "color-dodge",
  "screen",
  "lighter",
] as const;

export const ARTWORK_TINT_BLEND_MODES = [
  "multiply",
  "overlay",
  "screen",
  "color",
  "hue",
  "saturation",
  "luminosity",
  "soft-light",
  "hard-light",
  "color-burn",
  "color-dodge",
] as const;

export const ARTWORK_ANIMATION_PRESETS = [
  "wave",
  "cascade-lr",
  "cascade-rl",
  "cascade-tb",
  "reveal",
  "pulse",
] as const;

export type ArtworkCharacterSet = keyof typeof ARTWORK_CHARACTER_SETS;
export type ArtworkEffectBlendMode =
  (typeof ARTWORK_EFFECT_BLEND_MODES)[number];
export type ArtworkTintBlendMode = (typeof ARTWORK_TINT_BLEND_MODES)[number];
export type ArtworkAnimationPreset =
  (typeof ARTWORK_ANIMATION_PRESETS)[number];
export type ArtworkFit = "cover" | "contain" | "fill";

/** GPU transforms are retained for the reusable low-level renderer. */
export type ArtworkTransformOptions = {
  fit?: ArtworkFit;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  translateX?: number;
  translateY?: number;
  rotate?: number;
  skewX?: number;
  skewY?: number;
  flipX?: boolean;
  flipY?: boolean;
};

export type ArtworkTintOptions = {
  color?: string;
  opacity?: number;
  blendMode?: ArtworkTintBlendMode;
};

export type ArtworkColorOptions = {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  grayscale?: number;
  tint?: ArtworkTintOptions | false;
};

/** Names, units, and defaults intentionally mirror ASCII Magic's editor. */
export type ArtworkSharedEffectOptions = {
  fontSize?: number;
  blendMode?: ArtworkEffectBlendMode;
  charOpacity?: number;
  coverage?: number;
  edgeEmphasis?: number;
  darkThreshold?: number;
  brightness?: number;
  contrast?: number;
  invert?: boolean;
  dotGrid?: boolean;
  dotGridIntensity?: number;
  animated?: boolean;
  animPreset?: ArtworkAnimationPreset;
  animSpeed?: number;
  animIntensity?: number;
  animRandomness?: number;
};

export type ArtworkAsciiEffectOptions = ArtworkSharedEffectOptions & {
  kind: "ascii";
  characterSet?: ArtworkCharacterSet;
  charSet?: string;
  randomChars?: boolean;
  samplingIntervalMs?: number;
  samplingThreshold?: number;
};

export type ArtworkDotsEffectOptions = ArtworkSharedEffectOptions & {
  kind: "dots";
  dotScale?: number;
};

export type ArtworkTintEffectOptions = {
  kind: "tint";
  overlayColor?: string;
  overlayOpacity?: number;
  overlayBlend?: ArtworkTintBlendMode;
  saturation?: number;
  grayscale?: number;
  animateIn?: boolean;
};

export type ArtworkEffectOptions =
  | { kind: "none" }
  | ArtworkAsciiEffectOptions
  | ArtworkDotsEffectOptions;

export type ArtworkConfig = {
  transform: ArtworkTransformOptions;
  color: ArtworkColorOptions;
  effect: ArtworkEffectOptions;
  scrim: string | false;
};

export const DEFAULT_ARTWORK_CHARACTERS = ARTWORK_CHARACTER_SETS.standard;

export const DEFAULT_ARTWORK_CONFIG: Readonly<ArtworkConfig> = {
  transform: {
    fit: "cover",
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
  },
  color: {
    brightness: 0,
    contrast: 1,
    saturation: 1,
    grayscale: 0,
    tint: false,
  },
  effect: {
    kind: "ascii",
    characterSet: "standard",
    charSet: DEFAULT_ARTWORK_CHARACTERS,
    fontSize: 11,
    blendMode: "source-over",
    charOpacity: 100,
    coverage: 85,
    edgeEmphasis: 0,
    darkThreshold: 30,
    brightness: 0,
    contrast: 100,
    invert: false,
    dotGrid: false,
    dotGridIntensity: 100,
    randomChars: false,
    samplingIntervalMs: DEFAULT_ARTWORK_SAMPLING_INTERVAL_MS,
    samplingThreshold: DEFAULT_ARTWORK_SAMPLING_THRESHOLD,
    animated: false,
    animPreset: "wave",
    animSpeed: 3000,
    animIntensity: 60,
    animRandomness: 50,
  },
  scrim: false,
};

export function createDefaultArtworkConfig(): ArtworkConfig {
  return {
    transform: { ...DEFAULT_ARTWORK_CONFIG.transform },
    color: { ...DEFAULT_ARTWORK_CONFIG.color },
    effect: { ...DEFAULT_ARTWORK_CONFIG.effect },
    scrim: DEFAULT_ARTWORK_CONFIG.scrim,
  };
}
