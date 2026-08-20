import { hexToRgbUnit, type HalftoneConfig } from "./halftone";

const COLOR_BUCKETS = 8;
const MAX_FALLBACK_DENSITY = 120;
const TAU = Math.PI * 2;

type RenderOptions = {
  width: number;
  height: number;
  time: number;
  config: HalftoneConfig;
};

export type HalftoneCanvas2DRenderer = {
  render: (options: RenderOptions) => boolean;
  destroy: () => void;
};

type Dot = {
  radius: number;
  x: number;
  y: number;
};

export function createHalftoneCanvas2DRenderer(
  canvas: HTMLCanvasElement,
): HalftoneCanvas2DRenderer | null {
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = canvas.getContext("2d", { alpha: false });
  } catch {
    return null;
  }
  if (!context) return null;
  const canvasContext = context;

  function render({ width, height, time, config }: RenderOptions) {
    try {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
      const pixelHeight = Math.max(1, Math.round(height * pixelRatio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      canvasContext.fillStyle = config.background;
      canvasContext.fillRect(0, 0, width, height);

      const density = Math.min(config.dotDensity, MAX_FALLBACK_DENSITY);
      const cellSize = Math.min(width, height) / density;
      const angle = (config.patternAngle * Math.PI) / 180;
      const sine = Math.sin(angle);
      const cosine = Math.cos(angle);
      const transformedCorners = [
        rotateToGrid(width, 0, sine, cosine),
        rotateToGrid(0, height, sine, cosine),
        rotateToGrid(width, height, sine, cosine),
        { x: 0, y: 0 },
      ];
      const gridX = transformedCorners.map((point) => point.x / cellSize);
      const gridY = transformedCorners.map((point) => point.y / cellSize);
      const minGridX = Math.floor(Math.min(...gridX)) - 1;
      const maxGridX = Math.ceil(Math.max(...gridX)) + 1;
      const minGridY = Math.floor(Math.min(...gridY)) - 1;
      const maxGridY = Math.ceil(Math.max(...gridY)) + 1;
      const buckets: Dot[][] = Array.from(
        { length: COLOR_BUCKETS },
        () => [],
      );

      for (let gridRow = minGridY; gridRow <= maxGridY; gridRow += 1) {
        for (
          let gridColumn = minGridX;
          gridColumn <= maxGridX;
          gridColumn += 1
        ) {
          const rotatedX = (gridColumn + 0.5) * cellSize;
          const rotatedY = (gridRow + 0.5) * cellSize;
          const { x, y } = rotateGridPointToCanvas(
            rotatedX,
            rotatedY,
            height,
            sine,
            cosine,
          );
          if (
            x < -cellSize ||
            x > width + cellSize ||
            y < -cellSize ||
            y > height + cellSize
          ) {
            continue;
          }

          const pointX = (2 * x - width) / height;
          const pointY = (height - 2 * y) / height;
          const rawField = getFlowField(
            pointX,
            pointY,
            time,
            config.swirlDetail,
          );
          const balanceOffset = ((config.colorBalance / 100) - 0.5) * 0.65;
          const field = smoothstep(
            0.1 + balanceOffset,
            0.9 + balanceOffset,
            rawField,
          );
          const dotRadius =
            mix(0.05, 0.34, Math.pow(field, 0.92)) * cellSize;
          const bucket = Math.min(
            COLOR_BUCKETS - 1,
            Math.round(field * (COLOR_BUCKETS - 1)),
          );
          buckets[bucket].push({ radius: dotRadius, x, y });
        }
      }

      const colorA = hexToRgbUnit(config.colorA);
      const colorB = hexToRgbUnit(config.colorB);
      buckets.forEach((dots, index) => {
        if (dots.length === 0) return;
        const field = index / (COLOR_BUCKETS - 1);
        canvasContext.beginPath();
        dots.forEach((dot) => {
          canvasContext.moveTo(dot.x + dot.radius, dot.y);
          canvasContext.arc(dot.x, dot.y, dot.radius, 0, TAU);
        });
        canvasContext.fillStyle = toRgbCss([
          mix(colorB[0], colorA[0], field),
          mix(colorB[1], colorA[1], field),
          mix(colorB[2], colorA[2], field),
        ]);
        canvasContext.fill();
      });
      return true;
    } catch {
      return false;
    }
  }

  return {
    render,
    destroy() {
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}

export function rotateGridPointToCanvas(
  rotatedX: number,
  rotatedY: number,
  height: number,
  sine: number,
  cosine: number,
) {
  return {
    x: cosine * rotatedX - sine * rotatedY,
    y: height - (sine * rotatedX + cosine * rotatedY),
  };
}

function rotateToGrid(
  x: number,
  y: number,
  sine: number,
  cosine: number,
) {
  return {
    x: cosine * x + sine * y,
    y: -sine * x + cosine * y,
  };
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const normalized = Math.min(
    1,
    Math.max(0, (value - edge0) / (edge1 - edge0)),
  );
  return normalized * normalized * (3 - 2 * normalized);
}

function mix(start: number, end: number, amount: number) {
  return start * (1 - amount) + end * amount;
}

function getFlowField(
  pointX: number,
  pointY: number,
  time: number,
  detail: number,
) {
  const flowTime = time * 0.15;
  const scale = 0.56 + 0.035 * Math.min(5, Math.max(0, detail));
  const x = pointX * scale;
  const y = pointY * scale;
  const firstWarpX = 2 * fbm(x, y + flowTime, detail) - 1;
  const firstWarpY = 2 * fbm(x + 5.2, y - 0.73 * flowTime, detail) - 1;
  const secondWarpX =
    2 *
      fbm(
        x + 1.25 * firstWarpX + 1.7,
        y + 1.25 * firstWarpY - 0.42 * flowTime,
        detail,
      ) -
    1;
  const secondWarpY =
    2 *
      fbm(
        x + 1.25 * firstWarpX + 8.3,
        y + 1.25 * firstWarpY + 0.36 * flowTime,
        detail,
      ) -
    1;
  const warpedNoise = fbm(
    x + 1.7 * secondWarpX + 0.7 * firstWarpX - 0.35 * flowTime,
    y + 1.7 * secondWarpY + 0.7 * firstWarpY + 0.18 * flowTime,
    detail,
  );
  const flowingWave =
    0.5 +
    0.5 *
      Math.sin(
        0.55 * x -
          0.35 * y +
          3.6 * warpedNoise +
          0.8 * firstWarpX -
          0.82 * flowTime,
      );
  return mix(warpedNoise, flowingWave, 0.32);
}

function fbm(x: number, y: number, detail: number) {
  const octaveWeights = [
    0.5,
    0.25,
    0.125 * smoothstep(0, 1, detail),
    0.0625 * smoothstep(1, 3, detail),
    0.03125 * smoothstep(3, 5, detail),
  ];
  let value = 0;
  let normalization = 0;
  for (const weight of octaveWeights) {
    value += weight * valueNoise(x, y);
    normalization += weight;
    const nextX = 1.6 * x - 1.2 * y + 7.17;
    y = 1.2 * x + 1.6 * y + 3.91;
    x = nextX;
  }
  return value / normalization;
}

function valueNoise(x: number, y: number) {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  const localX = x - cellX;
  const localY = y - cellY;
  const curveX = localX * localX * (3 - 2 * localX);
  const curveY = localY * localY * (3 - 2 * localY);
  const bottom = mix(
    hash21(cellX, cellY),
    hash21(cellX + 1, cellY),
    curveX,
  );
  const top = mix(
    hash21(cellX, cellY + 1),
    hash21(cellX + 1, cellY + 1),
    curveX,
  );
  return mix(bottom, top, curveY);
}

function hash21(x: number, y: number) {
  const first = fractional(x * 123.34);
  const second = fractional(y * 345.45);
  const dot = first * (first + 34.345) + second * (second + 34.345);
  return fractional((first + dot) * (second + dot));
}

function fractional(value: number) {
  return value - Math.floor(value);
}

function toRgbCss(color: readonly number[]) {
  return `rgb(${color.map((channel) => Math.round(channel * 255)).join(" ")})`;
}
