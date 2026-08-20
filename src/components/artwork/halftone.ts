export type HalftoneConfig = {
  background: string;
  colorA: string;
  colorB: string;
  dotDensity: number;
  patternAngle: number;
  colorBalance: number;
  swirlDetail: number;
  animationSpeed: number;
};

export type HalftonePlaybackState =
  | "paused"
  | "reduced-motion"
  | "running";

export const DEFAULT_HALFTONE_CONFIG: HalftoneConfig = {
  background: "#200452",
  colorA: "#1580ed",
  colorB: "#3d0b59",
  dotDensity: 100,
  patternAngle: 45,
  colorBalance: 50,
  swirlDetail: 1,
  animationSpeed: 1,
};

export function normalizeHalftoneConfig(
  config: Partial<HalftoneConfig> = {},
): HalftoneConfig {
  return {
    background: normalizeHexColor(
      config.background,
      DEFAULT_HALFTONE_CONFIG.background,
    ),
    colorA: normalizeHexColor(config.colorA, DEFAULT_HALFTONE_CONFIG.colorA),
    colorB: normalizeHexColor(config.colorB, DEFAULT_HALFTONE_CONFIG.colorB),
    dotDensity: clamp(
      finiteOr(config.dotDensity, DEFAULT_HALFTONE_CONFIG.dotDensity),
      10,
      300,
    ),
    patternAngle: clamp(
      finiteOr(config.patternAngle, DEFAULT_HALFTONE_CONFIG.patternAngle),
      0,
      360,
    ),
    colorBalance: clamp(
      finiteOr(config.colorBalance, DEFAULT_HALFTONE_CONFIG.colorBalance),
      0,
      100,
    ),
    swirlDetail: clamp(
      finiteOr(config.swirlDetail, DEFAULT_HALFTONE_CONFIG.swirlDetail),
      0,
      5,
    ),
    animationSpeed: clamp(
      finiteOr(
        config.animationSpeed,
        DEFAULT_HALFTONE_CONFIG.animationSpeed,
      ),
      0,
      5,
    ),
  };
}

export function normalizeHexColor(
  value: string | undefined,
  fallback: string,
) {
  if (!value) return fallback;
  const normalized = value.startsWith("#") ? value : `#${value}`;
  if (/^#[\da-f]{6}$/i.test(normalized)) return normalized.toLowerCase();
  if (/^#[\da-f]{3}$/i.test(normalized)) {
    const [red, green, blue] = normalized.slice(1).split("");
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
  }
  return fallback;
}

export function hexToRgbUnit(color: string): [number, number, number] {
  const normalized = normalizeHexColor(color, "#000000").slice(1);
  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  ];
}

export function getHalftoneCellSize(
  width: number,
  height: number,
  dotDensity: number,
) {
  return Math.min(width, height) / clamp(dotDensity, 10, 300);
}

export function getHalftonePlaybackState(
  paused: boolean,
  animationSpeed: number,
  reducedMotion: boolean,
): HalftonePlaybackState {
  if (reducedMotion) return "reduced-motion";
  return paused || animationSpeed === 0 ? "paused" : "running";
}

function finiteOr(value: number | undefined, fallback: number) {
  return value === undefined || !Number.isFinite(value) ? fallback : value;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
