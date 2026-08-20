"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

import {
  ARTWORK_CHARACTER_SETS,
  DEFAULT_ARTWORK_CONFIG,
  DEFAULT_ARTWORK_SAMPLING_INTERVAL_MS,
  DEFAULT_ARTWORK_SAMPLING_THRESHOLD,
  type ArtworkAnimationPreset,
  type ArtworkColorOptions,
  type ArtworkEffectBlendMode,
  type ArtworkEffectOptions,
  type ArtworkTintBlendMode,
  type ArtworkTintEffectOptions,
  type ArtworkTransformOptions,
} from "./config";
import { createArtworkWebGLRenderer } from "./webgl";

const ARTWORK_TINT_INTRO_DURATION_MS = 1500;
const EMPTY_SOURCE_TINTS: ArtworkTintEffectOptions[] = [];

export { DEFAULT_ARTWORK_CHARACTERS } from "./config";
export type {
  ArtworkAnimationPreset,
  ArtworkAsciiEffectOptions,
  ArtworkColorOptions,
  ArtworkConfig,
  ArtworkDotsEffectOptions,
  ArtworkEffectOptions,
  ArtworkFit,
  ArtworkTintEffectOptions,
  ArtworkTintBlendMode,
  ArtworkTransformOptions,
} from "./config";

export type ArtworkProps = {
  src: string;
  alt?: string;
  className?: string;
  transform?: ArtworkTransformOptions;
  color?: ArtworkColorOptions;
  effect?: ArtworkEffectOptions;
  scrim?: string | false;
  showImage?: boolean;
  sourceTints?: ArtworkTintEffectOptions[];
};

type NormalizedSharedEffect = {
  fontSize: number;
  blendMode: ArtworkEffectBlendMode;
  charOpacity: number;
  coverage: number;
  edgeEmphasis: number;
  darkThreshold: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  dotGrid: boolean;
  dotGridIntensity: number;
  animated: boolean;
  animPreset: ArtworkAnimationPreset;
  animSpeed: number;
  animIntensity: number;
  animRandomness: number;
};

type NormalizedEffect =
  | { kind: "none" }
  | (NormalizedSharedEffect & {
      kind: "ascii";
      characterSet: keyof typeof ARTWORK_CHARACTER_SETS;
      charSet: string;
      randomChars: boolean;
      samplingIntervalMs: number;
      samplingThreshold: number;
    })
  | (NormalizedSharedEffect & { kind: "dots"; dotScale: number });

export function Artwork({
  src,
  alt = "",
  className,
  transform,
  color,
  effect,
  scrim = DEFAULT_ARTWORK_CONFIG.scrim,
  showImage = true,
  sourceTints = EMPTY_SOURCE_TINTS,
}: ArtworkProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const effectCanvasRef = useRef<HTMLCanvasElement>(null);
  const normalizedTransform = useMemo(
    () => normalizeTransform(transform),
    [transform],
  );
  const normalizedColor = useMemo(() => normalizeColor(color), [color]);
  const normalizedEffect = useMemo(() => normalizeEffect(effect), [effect]);
  const tint = normalizedColor.tint;
  const effectBlendMode =
    normalizedEffect.kind === "none"
      ? "normal"
      : toCssBlendMode(normalizedEffect.blendMode);

  useEffect(() => {
    const rootElement = rootRef.current;
    const imageElement = imageRef.current;
    const imageCanvasElement = imageCanvasRef.current;
    const effectCanvasElement = effectCanvasRef.current;
    if (!rootElement || !imageElement || !imageCanvasElement || !effectCanvasElement) return;
    const root = rootElement;
    const image = imageElement;
    const imageCanvas = imageCanvasElement;
    const effectCanvas = effectCanvasElement;

    const renderer = createArtworkWebGLRenderer(imageCanvas);
    const effectContextCandidate = effectCanvas.getContext("2d");
    const sampleCanvas = document.createElement("canvas");
    const sampleContextCandidate = sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    const tintScratchCanvas = document.createElement("canvas");
    const tintScratchContextCandidate = tintScratchCanvas.getContext("2d");
    if (
      !effectContextCandidate ||
      !sampleContextCandidate ||
      !tintScratchContextCandidate
    ) {
      renderer?.destroy();
      return;
    }
    const effectContext = effectContextCandidate;
    const sampleContext = sampleContextCandidate;
    const tintScratchContext = tintScratchContextCandidate;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let columns = 0;
    let rows = 0;
    let cellWidth = 0;
    let cellHeight = 0;
    let deviceScale = 1;
    let pixels: Uint8ClampedArray | null = null;
    let minimumLuminance = 0;
    let luminanceRange = 1;
    let samplingFrame = 0;
    let lastSamplingFrameAt = 0;
    let renderedCharacters: string[] = [];
    const tintAnimationStartedAt = performance.now();
    const hasTintIntro = sourceTints.some((tintEffect) => tintEffect.animateIn);
    let tintIntroCompleted = !hasTintIntro || reducedMotion.matches;

    function refreshSamples(timestamp: number) {
      if (!columns || !rows) return;
      sampleContext.save();
      sampleContext.globalAlpha = 1;
      sampleContext.globalCompositeOperation = "source-over";
      sampleContext.filter = "none";
      sampleContext.clearRect(0, 0, columns, rows);
      sampleContext.drawImage(imageCanvas, 0, 0, columns, rows);
      sampleContext.restore();
      applySourceTints(
        sampleContext,
        sampleCanvas,
        tintScratchContext,
        tintScratchCanvas,
        sourceTints,
        timestamp - tintAnimationStartedAt,
        reducedMotion.matches,
      );
      pixels = sampleContext.getImageData(0, 0, columns, rows).data;
      let darkest = 255;
      let brightest = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const value = luminance255(
          pixels[index],
          pixels[index + 1],
          pixels[index + 2],
        );
        darkest = Math.min(darkest, value);
        brightest = Math.max(brightest, value);
      }
      minimumLuminance = darkest;
      luminanceRange = brightest - darkest || 1;
    }

    function drawEffect(timestamp?: number, sampleCharacters = false) {
      const width = effectCanvas.clientWidth;
      const height = effectCanvas.clientHeight;
      effectContext.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      effectContext.clearRect(0, 0, width, height);

      if (normalizedEffect.kind === "none" || !pixels || !columns || !rows) {
        effectCanvas.dataset.artworkFrame = "0";
        return;
      }

      const options = normalizedEffect;
      const contrastFactor =
        (259 * (options.contrast + 255)) /
        (255 * (259 - options.contrast));
      const brightnessOffset = (options.brightness / 100) * 255;
      const baseOpacity = options.charOpacity / 100;
      const edgeStrength = options.edgeEmphasis / 100;
      const densityThreshold = 0.6 * (1 - options.darkThreshold / 100);
      const animationTime =
        timestamp === undefined ? undefined : timestamp / options.animSpeed;
      const animationIntensity = options.animIntensity / 100;
      const animationBase = 1 - animationIntensity;
      const characters = options.kind === "ascii" ? options.charSet : "";
      const nonSpaceCharacters = characters.replaceAll(" ", "") || characters;

      effectContext.globalCompositeOperation = "source-over";
      effectContext.textAlign = "left";
      effectContext.textBaseline = "top";
      effectContext.font = `${cellHeight}px "Courier New", Courier, monospace`;

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const pixelIndex = (row * columns + column) * 4;
          const sourceAlpha = pixels[pixelIndex + 3] / 255;
          if (sourceAlpha <= 0) continue;

          const sourceRed = pixels[pixelIndex];
          const sourceGreen = pixels[pixelIndex + 1];
          const sourceBlue = pixels[pixelIndex + 2];
          const rawLuminance = luminance255(sourceRed, sourceGreen, sourceBlue);
          let normalizedLuminance = clamp(
            (rawLuminance - minimumLuminance) / luminanceRange,
            0,
            1,
          );
          if (options.invert) normalizedLuminance = 1 - normalizedLuminance;

          const red = transformColorChannel(sourceRed, contrastFactor, brightnessOffset);
          const green = transformColorChannel(sourceGreen, contrastFactor, brightnessOffset);
          const blue = transformColorChannel(sourceBlue, contrastFactor, brightnessOffset);
          const edge = getEdgeStrength(pixels, columns, rows, column, row);

          if (options.kind === "dots") {
            if (
              options.coverage < 100 &&
              normalizedLuminance < 1 - options.coverage / 100
            ) {
              continue;
            }

            const baseRadius = getArtworkDotRadius(
              normalizedLuminance,
              cellWidth,
              cellHeight,
              options.dotScale,
            );
            if (baseRadius < 0.3) continue;
            const modulation = getAnimationModulation(
              options,
              column,
              row,
              columns,
              rows,
              animationTime,
            );
            const radius = baseRadius * modulation;
            if (radius < 0.3) continue;

            effectContext.fillStyle = `rgba(${Math.round(red)}, ${Math.round(
              green,
            )}, ${Math.round(blue)}, ${baseOpacity * sourceAlpha * modulation})`;
            effectContext.beginPath();
            effectContext.arc(
              (column + 0.5) * cellWidth,
              (row + 0.5) * cellHeight,
              radius,
              0,
              Math.PI * 2,
            );
            effectContext.fill();
            continue;
          }

          const visibility = getArtworkDensityVisibility(
            normalizedLuminance,
            options.darkThreshold,
          );
          const edgeEligibility =
            normalizedLuminance +
            Math.pow(edge, 0.4) * edgeStrength * visibility;
          const mappedLuminance = clamp(
            normalizedLuminance +
              0.6 * Math.pow(edge, 0.3) * edgeStrength * visibility +
              (options.darkThreshold - 30) / 100,
            0,
            1,
          );
          if (
            edgeEligibility < densityThreshold ||
            (options.coverage < 100 &&
              artworkCoverageHash(column, row) > options.coverage * 10)
          ) {
            continue;
          }

          if (!characters.length) continue;

          let characterIndex: number;
          let character: string;
          if (options.randomChars) {
            characterIndex = Math.floor(
              Math.random() * nonSpaceCharacters.length,
            );
            character = nonSpaceCharacters[characterIndex] ?? "";
          } else {
            characterIndex = Math.min(
              characters.length - 1,
              Math.floor((1 - mappedLuminance) * characters.length),
            );
            character = characters[characterIndex] ?? "";
          }

          if (options.animated) {
            const cellIndex = row * columns + column;
            if (
              renderedCharacters[cellIndex] === undefined ||
              (sampleCharacters &&
                shouldSampleArtworkCharacter(
                  column,
                  row,
                  samplingFrame,
                  options.samplingThreshold,
                ))
            ) {
              const sampledCharacters = options.randomChars
                ? nonSpaceCharacters
                : characters;
              const sampledIndex = options.randomChars
                ? artworkSamplingHash(column, row, samplingFrame) %
                  sampledCharacters.length
                : clamp(
                    characterIndex +
                      (artworkSamplingHash(column, row, samplingFrame) % 3) -
                      1,
                    0,
                    sampledCharacters.length - 1,
                  );
              renderedCharacters[cellIndex] =
                sampledCharacters[sampledIndex] ?? character;
            }
            character = renderedCharacters[cellIndex] ?? character;
          }
          if (character === " ") continue;

          let opacity = baseOpacity * sourceAlpha;
          if (animationTime !== undefined && options.animated) {
            const { phase, jitter } = getArtworkAnimationPhase(
              column,
              row,
              columns,
              rows,
              options.animPreset,
              options.animRandomness,
            );
            const wave = Math.sin(
              positiveModulo(animationTime + phase + jitter, 1) * Math.PI * 2,
            );
            opacity *= animationBase + (1 - animationBase) * (0.5 + 0.5 * wave);
          }

          effectContext.fillStyle = `rgba(${Math.round(red)}, ${Math.round(
            green,
          )}, ${Math.round(blue)}, ${opacity})`;
          effectContext.fillText(character, column * cellWidth, row * cellHeight);
        }
      }

      if (options.dotGrid) {
        drawDotGrid(
          effectContext,
          columns,
          rows,
          cellWidth,
          cellHeight,
          options.dotGridIntensity,
        );
      }
      effectCanvas.dataset.artworkFrame =
        options.kind === "ascii"
          ? String(samplingFrame)
          : String(Math.round(timestamp ?? 0));
    }

    function prepare() {
      if (!image.complete || !image.naturalWidth || !image.naturalHeight) return;
      const bounds = root.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const rendered =
        renderer?.render({
          canvas: imageCanvas,
          image,
          width: bounds.width,
          height: bounds.height,
          transform: normalizedTransform,
          color: normalizedColor,
        }) ?? false;
      root.dataset.artworkRenderer = rendered ? "webgl" : "image";
      image.style.opacity = showImage && !rendered ? "1" : "0";
      imageCanvas.style.opacity = showImage && rendered ? "1" : "0";

      if (normalizedEffect.kind === "none" || !rendered) {
        pixels = null;
        drawEffect();
        return;
      }

      cellHeight = Math.max(3, normalizedEffect.fontSize);
      cellWidth = cellHeight * 0.6;
      columns = Math.max(
        1,
        normalizedEffect.kind === "dots"
          ? Math.ceil(bounds.width / cellWidth)
          : Math.floor(bounds.width / cellWidth),
      );
      rows = Math.max(
        1,
        normalizedEffect.kind === "dots"
          ? Math.ceil(bounds.height / cellHeight)
          : Math.floor(bounds.height / cellHeight),
      );
      cellWidth = bounds.width / columns;
      cellHeight = bounds.height / rows;
      deviceScale = Math.min(window.devicePixelRatio || 1, 2);
      effectCanvas.width = Math.round(bounds.width * deviceScale);
      effectCanvas.height = Math.round(bounds.height * deviceScale);
      sampleCanvas.width = columns;
      sampleCanvas.height = rows;
      tintScratchCanvas.width = columns;
      tintScratchCanvas.height = rows;
      const timestamp = performance.now();
      samplingFrame = 0;
      lastSamplingFrameAt = timestamp;
      renderedCharacters = new Array(columns * rows);
      refreshSamples(timestamp);
      drawEffect(
        (normalizedEffect.animated || hasTintIntro) && !reducedMotion.matches
          ? timestamp
          : undefined,
        true,
      );
    }

    function animate(timestamp: number) {
      animationFrame = 0;
      const canAnimate =
        !root.hidden &&
        !reducedMotion.matches &&
        document.visibilityState === "visible";
      const tintIntroFrame =
        hasTintIntro && !tintIntroCompleted && canAnimate;
      if (tintIntroFrame) {
        refreshSamples(timestamp);
        if (
          timestamp - tintAnimationStartedAt >=
          ARTWORK_TINT_INTRO_DURATION_MS
        ) {
          tintIntroCompleted = true;
        }
      }
      const samplingFrameDue =
        canAnimate &&
        normalizedEffect.kind === "ascii" &&
        normalizedEffect.animated &&
        timestamp - lastSamplingFrameAt >=
          normalizedEffect.samplingIntervalMs;
      const continuousAnimationFrame =
        canAnimate &&
        normalizedEffect.kind === "dots" &&
        normalizedEffect.animated;
      if (samplingFrameDue) {
        samplingFrame += 1;
        lastSamplingFrameAt = timestamp;
      }
      if (
        normalizedEffect.kind !== "none" &&
        (samplingFrameDue || continuousAnimationFrame || tintIntroFrame) &&
        canAnimate
      ) {
        drawEffect(timestamp, samplingFrameDue);
      }
      if (!root.hidden) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    }

    function hiddenStateChanged() {
      if (!root.hidden && !animationFrame) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    }

    function motionPreferenceChanged() {
      const timestamp = performance.now();
      if (reducedMotion.matches) tintIntroCompleted = true;
      samplingFrame = 0;
      lastSamplingFrameAt = timestamp;
      renderedCharacters = new Array(columns * rows);
      refreshSamples(timestamp);
      drawEffect(reducedMotion.matches ? undefined : timestamp, true);
    }

    const resizeObserver = new ResizeObserver(prepare);
    const hiddenObserver = new MutationObserver(hiddenStateChanged);
    resizeObserver.observe(root);
    hiddenObserver.observe(root, {
      attributeFilter: ["hidden"],
      attributes: true,
    });
    image.addEventListener("load", prepare);
    reducedMotion.addEventListener("change", motionPreferenceChanged);
    if (image.complete) prepare();
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      hiddenObserver.disconnect();
      image.removeEventListener("load", prepare);
      reducedMotion.removeEventListener("change", motionPreferenceChanged);
      renderer?.destroy();
    };
  }, [
    normalizedColor,
    normalizedEffect,
    normalizedTransform,
    showImage,
    sourceTints,
    src,
  ]);

  const tintStyle: CSSProperties | undefined =
    tint && tint.opacity > 0
      ? {
          backgroundColor: tint.color,
          mixBlendMode: tint.blendMode,
          opacity: tint.opacity,
        }
      : undefined;

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className,
      )}
      data-artwork
      data-artwork-effect={normalizedEffect.kind}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- WebGL uploads this exact DOM image */}
      <img
        ref={imageRef}
        className="absolute inset-0 block size-full select-none object-cover"
        src={src}
        alt={alt}
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />
      <canvas
        ref={imageCanvasRef}
        className="absolute inset-0 block size-full select-none object-cover opacity-0"
        data-artwork-image-canvas
        aria-hidden="true"
      />
      {scrim ? (
        <span
          className="pointer-events-none absolute inset-0 z-1 size-full"
          style={{ background: scrim }}
          aria-hidden="true"
        />
      ) : null}
      <canvas
        ref={effectCanvasRef}
        className="pointer-events-none absolute inset-0 z-2 size-full motion-reduce:opacity-72"
        style={{ mixBlendMode: effectBlendMode }}
        data-artwork-canvas
        data-artwork-effect-canvas
        aria-hidden="true"
      />
      {tintStyle ? (
        <span
          className="pointer-events-none absolute inset-0 z-3 size-full"
          style={tintStyle}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

function normalizeTransform(
  transform?: ArtworkTransformOptions,
): Required<ArtworkTransformOptions> {
  return {
    fit: transform?.fit ?? "cover",
    scale: clamp(transform?.scale ?? 1, 0.05, 8),
    scaleX: clamp(transform?.scaleX ?? 1, 0.05, 8),
    scaleY: clamp(transform?.scaleY ?? 1, 0.05, 8),
    translateX: clamp(transform?.translateX ?? 0, -200, 200),
    translateY: clamp(transform?.translateY ?? 0, -200, 200),
    rotate: clamp(transform?.rotate ?? 0, -360, 360),
    skewX: clamp(transform?.skewX ?? 0, -75, 75),
    skewY: clamp(transform?.skewY ?? 0, -75, 75),
    flipX: transform?.flipX ?? false,
    flipY: transform?.flipY ?? false,
  };
}

type NormalizedColor = Required<Omit<ArtworkColorOptions, "tint">> & {
  tint: false | { color: string; opacity: number; blendMode: ArtworkTintBlendMode };
};

function normalizeColor(color?: ArtworkColorOptions): NormalizedColor {
  const tint: NormalizedColor["tint"] =
    color?.tint === false || color?.tint === undefined
      ? false
      : {
          color: color.tint.color ?? "#4338ca",
          opacity: clamp(color.tint.opacity ?? 0.35, 0, 1),
          blendMode: color.tint.blendMode ?? "color",
        };
  return {
    brightness: clamp(color?.brightness ?? 0, -1, 1),
    contrast: clamp(color?.contrast ?? 1, 0, 3),
    saturation: clamp(color?.saturation ?? 1, 0, 3),
    grayscale: clamp(color?.grayscale ?? 0, 0, 1),
    tint,
  };
}

function normalizeEffect(effect?: ArtworkEffectOptions): NormalizedEffect {
  const selected = effect ?? DEFAULT_ARTWORK_CONFIG.effect;
  if (selected.kind === "none") return selected;

  const shared: NormalizedSharedEffect = {
    fontSize: clamp(selected.fontSize ?? 11, 3, 80),
    blendMode: selected.blendMode ?? "source-over",
    charOpacity: clamp(selected.charOpacity ?? 100, 0, 100),
    coverage: clamp(selected.coverage ?? 85, 0, 100),
    edgeEmphasis: clamp(selected.edgeEmphasis ?? 0, 0, 100),
    darkThreshold: clamp(selected.darkThreshold ?? 30, 0, 100),
    brightness: clamp(selected.brightness ?? 0, -100, 100),
    contrast: clamp(selected.contrast ?? 100, -100, 100),
    invert: selected.invert ?? false,
    dotGrid: selected.dotGrid ?? false,
    dotGridIntensity: clamp(selected.dotGridIntensity ?? 100, 0, 100),
    animated: selected.animated ?? false,
    animPreset: selected.animPreset ?? "wave",
    animSpeed: clamp(selected.animSpeed ?? 3000, 1000, 8000),
    animIntensity: clamp(selected.animIntensity ?? 60, 0, 100),
    animRandomness: clamp(selected.animRandomness ?? 50, 0, 100),
  };

  if (selected.kind === "dots") {
    return {
      kind: "dots",
      ...shared,
      dotScale: clamp(selected.dotScale ?? 100, 0, 200),
    };
  }

  const characterSet = selected.characterSet ?? "standard";
  return {
    kind: "ascii",
    ...shared,
    characterSet,
    charSet:
      selected.charSet ??
      ARTWORK_CHARACTER_SETS[characterSet] ??
      ARTWORK_CHARACTER_SETS.standard,
    randomChars: selected.randomChars ?? false,
    samplingIntervalMs: clamp(
      selected.samplingIntervalMs ?? DEFAULT_ARTWORK_SAMPLING_INTERVAL_MS,
      16,
      8000,
    ),
    samplingThreshold: clamp(
      selected.samplingThreshold ?? DEFAULT_ARTWORK_SAMPLING_THRESHOLD,
      0,
      1,
    ),
  };
}

function toCssBlendMode(blendMode: ArtworkEffectBlendMode): CSSProperties["mixBlendMode"] {
  if (blendMode === "source-over") return "normal";
  if (blendMode === "lighter") return "plus-lighter";
  return blendMode;
}

function applySourceTints(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  scratchContext: CanvasRenderingContext2D,
  scratchCanvas: HTMLCanvasElement,
  sourceTints: ArtworkTintEffectOptions[],
  elapsedMs: number,
  reducedMotion: boolean,
) {
  for (const tintEffect of sourceTints) {
    const saturation = clamp(tintEffect.saturation ?? 100, 0, 200);
    if (saturation !== 100) {
      scratchContext.save();
      scratchContext.globalAlpha = 1;
      scratchContext.globalCompositeOperation = "source-over";
      scratchContext.filter = "none";
      scratchContext.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
      scratchContext.drawImage(canvas, 0, 0);
      scratchContext.restore();

      context.save();
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.filter = `saturate(${saturation}%)`;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(scratchCanvas, 0, 0);
      context.restore();
    }

    const overlayOpacity = clamp(tintEffect.overlayOpacity ?? 0, 0, 100) / 100;
    if (overlayOpacity > 0) {
      context.save();
      context.globalAlpha = overlayOpacity;
      context.globalCompositeOperation = tintEffect.overlayBlend ?? "multiply";
      context.fillStyle = tintEffect.overlayColor ?? "#ff0000";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();
    }

    applyGrayscaleTint(
      context,
      canvas,
      clamp(tintEffect.grayscale ?? 0, 0, 100) / 100,
    );
    if (tintEffect.animateIn) {
      applyGrayscaleTint(
        context,
        canvas,
        getArtworkTintIntroOpacity(elapsedMs, reducedMotion),
      );
    }
  }
}

function applyGrayscaleTint(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  opacity: number,
) {
  if (opacity <= 0) return;
  context.save();
  context.globalAlpha = opacity;
  context.globalCompositeOperation = "saturation";
  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
}

export function getArtworkTintIntroOpacity(
  elapsedMs: number,
  reducedMotion = false,
) {
  if (reducedMotion) return 0;
  const progress = clamp(elapsedMs / ARTWORK_TINT_INTRO_DURATION_MS, 0, 1);
  return 0.5 * Math.pow(1 - progress, 3);
}

export function getArtworkDensityVisibility(luminance: number, darkThreshold = 30) {
  const threshold = 0.6 * (1 - clamp(darkThreshold, 0, 100) / 100);
  const start = 0.55 * threshold;
  const progress = clamp((clamp(luminance, 0, 1) - start) / (threshold - start || 1), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

export function getArtworkDotRadius(
  luminance: number,
  cellWidth: number,
  cellHeight: number,
  dotScale = 100,
) {
  return (
    0.45 *
    Math.min(cellWidth, cellHeight) *
    (0.15 + 0.85 * clamp(luminance, 0, 1)) *
    (clamp(dotScale, 0, 200) / 100)
  );
}

export function getArtworkAnimationPhase(
  column: number,
  row: number,
  columns: number,
  rows: number,
  preset: ArtworkAnimationPreset,
  randomnessPercent: number,
) {
  const randomness = clamp(randomnessPercent, 0, 100) / 100;
  const jitter = (((1301 * column + 9377 * row) % 1000) / 1000) * randomness * 0.3;
  let basePhase: number;
  switch (preset) {
    case "cascade-lr":
      basePhase = 1 - column / Math.max(1, columns);
      break;
    case "cascade-rl":
      basePhase = column / Math.max(1, columns);
      break;
    case "cascade-tb":
      basePhase = row / Math.max(1, rows);
      break;
    case "reveal":
      basePhase = ((row * columns + column) * 0.05) % 1;
      break;
    case "pulse":
      basePhase = 0;
      break;
    case "wave":
    default: {
      const normalizedX = (column + 0.5) / Math.max(1, columns) - 0.5;
      const normalizedY = (row + 0.5) / Math.max(1, rows) - 0.5;
      basePhase = Math.hypot(normalizedX, normalizedY);
      break;
    }
  }
  const randomPhase =
    ((7919 * column + 6271 * row + column * column * 3571) % 10000) / 10000;
  return {
    phase: basePhase * (1 - randomness) + randomPhase * randomness,
    jitter,
    randomPhase,
  };
}

function getAnimationModulation(
  options: NormalizedSharedEffect,
  column: number,
  row: number,
  columns: number,
  rows: number,
  animationTime?: number,
) {
  if (!options.animated || animationTime === undefined) return 1;
  const { phase, jitter } = getArtworkAnimationPhase(
    column,
    row,
    columns,
    rows,
    options.animPreset,
    options.animRandomness,
  );
  const wave = Math.sin(positiveModulo(animationTime + phase + jitter, 1) * Math.PI * 2);
  const intensity = options.animIntensity / 100;
  return 1 - intensity + intensity * (0.5 + 0.5 * wave);
}

function drawDotGrid(
  context: CanvasRenderingContext2D,
  columns: number,
  rows: number,
  cellWidth: number,
  cellHeight: number,
  intensityPercent: number,
) {
  const intensity = clamp(intensityPercent, 0, 100) / 100;
  const arm = Math.max(2, 0.15 * cellHeight);
  context.save();
  context.globalCompositeOperation = "screen";
  context.strokeStyle = `rgba(200, 255, 255, ${0.4 * intensity})`;
  context.lineWidth = Math.max(1, 0.05 * cellHeight);
  context.shadowColor = `rgba(0, 255, 255, ${0.8 * intensity})`;
  context.shadowBlur = 6;
  context.beginPath();
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const x = column * cellWidth;
      const y = row * cellHeight;
      context.moveTo(x - arm, y);
      context.lineTo(x + arm, y);
      context.moveTo(x, y - arm);
      context.lineTo(x, y + arm);
    }
  }
  context.stroke();
  context.restore();
}

function transformColorChannel(value: number, contrastFactor: number, brightnessOffset: number) {
  return clamp(contrastFactor * (value - 128) + 128 + brightnessOffset, 0, 255);
}

function getEdgeStrength(
  pixels: Uint8ClampedArray,
  columns: number,
  rows: number,
  column: number,
  row: number,
) {
  const left = pixelLuminance(pixels, columns, Math.max(0, column - 1), row);
  const right = pixelLuminance(pixels, columns, Math.min(columns - 1, column + 1), row);
  const top = pixelLuminance(pixels, columns, column, Math.max(0, row - 1));
  const bottom = pixelLuminance(pixels, columns, column, Math.min(rows - 1, row + 1));
  return clamp(Math.hypot(right - left, bottom - top), 0, 1);
}

function pixelLuminance(
  pixels: Uint8ClampedArray,
  columns: number,
  column: number,
  row: number,
) {
  const index = (row * columns + column) * 4;
  return luminance255(pixels[index], pixels[index + 1], pixels[index + 2]) / 255;
}

function luminance255(red: number, green: number, blue: number) {
  return 0.299 * red + 0.587 * green + 0.114 * blue;
}

function artworkCoverageHash(column: number, row: number) {
  return (
    ((Math.imul(0x466f45d, column) ^ Math.imul(0x127409f, row)) >>> 0) %
    1000
  );
}

export function shouldSampleArtworkCharacter(
  column: number,
  row: number,
  frame: number,
  threshold = DEFAULT_ARTWORK_SAMPLING_THRESHOLD,
) {
  return (
    artworkSamplingHash(column + 97, row + 193, frame) / 0x100000000 <
    clamp(threshold, 0, 1)
  );
}

function artworkSamplingHash(column: number, row: number, frame: number) {
  let value =
    Math.imul(column + 1, 374761393) ^
    Math.imul(row + 1, 668265263) ^
    Math.imul(frame + 1, 2246822519);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
