"use client";

import { useEffect, useRef } from "react";

import styles from "./Artwork.module.css";

const DEFAULT_CHARACTERS = "@#S08Xx+=-;:.";
const GLYPH_ASPECT_RATIO = 1.45;
const COVERAGE = 0.85;
const DEFAULT_BRIGHTNESS_THRESHOLD = 0.34;
const DEFAULT_BRIGHTNESS_FEATHER = 0.2;

export type ArtworkProps = {
  src: string;
  alt?: string;
  className?: string;
  characters?: string;
  cellSize?: number;
  intervalMs?: number;
  opacity?: number;
  brightnessThreshold?: number;
  brightnessFeather?: number;
};

type SourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function Artwork({
  src,
  alt = "",
  className,
  characters = DEFAULT_CHARACTERS,
  cellSize = 11,
  intervalMs = 220,
  opacity = 0.48,
  brightnessThreshold = DEFAULT_BRIGHTNESS_THRESHOLD,
  brightnessFeather = DEFAULT_BRIGHTNESS_FEATHER,
}: ArtworkProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!root || !image || !canvas || !characters.length) return;

    const context = canvas.getContext("2d");
    const sampleCanvas = document.createElement("canvas");
    const sampleContext = sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!context || !sampleContext) return;

    const artworkRoot = root;
    const artworkImage = image;
    const artworkCanvas = canvas;
    const artworkContext = context;
    const artworkSampleContext = sampleContext;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let cellWidth = cellSize;
    let cellHeight = cellSize * GLYPH_ASPECT_RATIO;
    let columns = 0;
    let rows = 0;
    let deviceScale = 1;
    let frame = 0;
    let lastFrameAt = 0;
    let pixels: Uint8ClampedArray | null = null;

    function draw(nextFrame: number) {
      if (!pixels || !columns || !rows) return;

      const width = artworkCanvas.clientWidth;
      const height = artworkCanvas.clientHeight;
      artworkContext.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      artworkContext.clearRect(0, 0, width, height);
      artworkContext.font = `500 ${Math.max(8, cellHeight * 0.88)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      artworkContext.textAlign = "center";
      artworkContext.textBaseline = "middle";

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          if (hashCell(column, row, 0) / 0xffffffff > COVERAGE) continue;

          const pixelIndex = (row * columns + column) * 4;
          const sourceAlpha = pixels[pixelIndex + 3] / 255;
          if (sourceAlpha === 0) continue;

          const red = pixels[pixelIndex];
          const green = pixels[pixelIndex + 1];
          const blue = pixels[pixelIndex + 2];
          const brightness =
            (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
          const visibility = getArtworkVisibility(
            brightness,
            brightnessThreshold,
            brightnessFeather,
          );
          if (visibility <= 0.01) continue;

          const character = selectArtworkCharacter(
            characters,
            brightness,
            column,
            row,
            nextFrame,
          );
          const characterAlpha =
            sourceAlpha *
            opacity *
            visibility *
            (0.55 + brightness * 0.45);
          const liftedRed = Math.min(255, red * 0.82 + 78);
          const liftedGreen = Math.min(255, green * 0.82 + 78);
          const liftedBlue = Math.min(255, blue * 0.82 + 88);

          artworkContext.fillStyle = `rgb(${liftedRed} ${liftedGreen} ${liftedBlue} / ${characterAlpha})`;
          artworkContext.fillText(
            character,
            (column + 0.5) * cellWidth,
            (row + 0.5) * cellHeight,
          );
        }
      }

      artworkCanvas.dataset.artworkFrame = String(nextFrame);
    }

    function prepare() {
      if (
        !artworkImage.complete ||
        !artworkImage.naturalWidth ||
        !artworkImage.naturalHeight
      ) {
        return;
      }

      const bounds = artworkRoot.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      columns = Math.max(1, Math.ceil(bounds.width / cellSize));
      rows = Math.max(
        1,
        Math.ceil(bounds.height / (cellSize * GLYPH_ASPECT_RATIO)),
      );
      cellWidth = bounds.width / columns;
      cellHeight = bounds.height / rows;
      deviceScale = Math.min(window.devicePixelRatio || 1, 2);

      artworkCanvas.width = Math.round(bounds.width * deviceScale);
      artworkCanvas.height = Math.round(bounds.height * deviceScale);
      sampleCanvas.width = columns;
      sampleCanvas.height = rows;

      const source = getCoverSourceRect(
        artworkImage.naturalWidth,
        artworkImage.naturalHeight,
        bounds.width / bounds.height,
      );
      artworkSampleContext.clearRect(0, 0, columns, rows);
      artworkSampleContext.drawImage(
        artworkImage,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        columns,
        rows,
      );
      pixels = artworkSampleContext.getImageData(0, 0, columns, rows).data;
      frame = reducedMotion.matches ? 0 : frame;
      draw(frame);
    }

    function animate(timestamp: number) {
      if (
        !reducedMotion.matches &&
        document.visibilityState === "visible" &&
        timestamp - lastFrameAt >= intervalMs
      ) {
        frame += 1;
        lastFrameAt = timestamp;
        draw(frame);
      }
      animationFrame = window.requestAnimationFrame(animate);
    }

    function motionPreferenceChanged() {
      if (reducedMotion.matches) {
        frame = 0;
        draw(frame);
      }
    }

    const resizeObserver = new ResizeObserver(prepare);
    resizeObserver.observe(artworkRoot);
    artworkImage.addEventListener("load", prepare);
    reducedMotion.addEventListener("change", motionPreferenceChanged);
    if (artworkImage.complete) prepare();
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      artworkImage.removeEventListener("load", prepare);
      reducedMotion.removeEventListener("change", motionPreferenceChanged);
    };
  }, [
    brightnessFeather,
    brightnessThreshold,
    cellSize,
    characters,
    intervalMs,
    opacity,
    src,
  ]);

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
    >
      {/* A real image keeps the wallpaper visible before the client effect is ready. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- the canvas samples this exact DOM image */}
      <img
        ref={imageRef}
        className={styles.image}
        src={src}
        alt={alt}
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />
      <span className={styles.scrim} aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        data-artwork-canvas
        aria-hidden="true"
      />
    </div>
  );
}

export function getCoverSourceRect(
  sourceWidth: number,
  sourceHeight: number,
  targetAspectRatio: number,
): SourceRect {
  const sourceAspectRatio = sourceWidth / sourceHeight;

  if (sourceAspectRatio > targetAspectRatio) {
    const width = sourceHeight * targetAspectRatio;
    return {
      x: (sourceWidth - width) / 2,
      y: 0,
      width,
      height: sourceHeight,
    };
  }

  const height = sourceWidth / targetAspectRatio;
  return {
    x: 0,
    y: (sourceHeight - height) / 2,
    width: sourceWidth,
    height,
  };
}

export function selectArtworkCharacter(
  characters: string,
  brightness: number,
  column: number,
  row: number,
  frame: number,
) {
  if (!characters.length) return "";

  const normalizedBrightness = Math.min(1, Math.max(0, brightness));
  const baseIndex = Math.round(
    (1 - normalizedBrightness) * (characters.length - 1),
  );
  const variation = (hashCell(column, row, frame) % 3) - 1;
  const index = Math.min(
    characters.length - 1,
    Math.max(0, baseIndex + variation),
  );
  return characters[index];
}

export function getArtworkVisibility(
  brightness: number,
  threshold = DEFAULT_BRIGHTNESS_THRESHOLD,
  feather = DEFAULT_BRIGHTNESS_FEATHER,
) {
  const value = Math.min(1, Math.max(0, brightness));
  const start = Math.min(1, Math.max(0, threshold));
  const width = Math.max(0.001, feather);
  const progress = Math.min(1, Math.max(0, (value - start) / width));

  return progress * progress * (3 - 2 * progress);
}

function hashCell(column: number, row: number, frame: number) {
  let value =
    Math.imul(column + 1, 374761393) ^
    Math.imul(row + 1, 668265263) ^
    Math.imul(frame + 1, 2246822519);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}
