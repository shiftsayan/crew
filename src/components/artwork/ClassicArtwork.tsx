"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export const CLASSIC_ARTWORK_CHARACTERS = "@#S08Xxthecrew+=-;:.";
const GLYPH_ASPECT_RATIO = 1.45;
const COVERAGE = 0.85;
const BRIGHTNESS_THRESHOLD = 0.25;
const BRIGHTNESS_FEATHER = 0.5;
const SAMPLING_THRESHOLD = 0.6;

export type ClassicArtworkProps = {
  src: string;
  alt?: string;
  className?: string;
};

type SourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function ClassicArtwork({
  src,
  alt = "",
  className,
}: ClassicArtworkProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const rootCandidate = rootRef.current;
    const imageCandidate = imageRef.current;
    const canvasCandidate = canvasRef.current;
    if (!rootCandidate || !imageCandidate || !canvasCandidate) return;
    const rootElement = rootCandidate;
    const imageElement = imageCandidate;
    const canvasElement = canvasCandidate;

    const contextCandidate = canvasElement.getContext("2d");
    const sampleCanvas = document.createElement("canvas");
    const sampleContextCandidate = sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!contextCandidate || !sampleContextCandidate) return;

    const context = contextCandidate;
    const sampleContext = sampleContextCandidate;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let cellWidth = 10;
    let cellHeight = 10 * GLYPH_ASPECT_RATIO;
    let columns = 0;
    let rows = 0;
    let deviceScale = 1;
    let frame = 0;
    let lastFrameAt = 0;
    let pixels: Uint8ClampedArray | null = null;
    let renderedCharacters: string[] = [];

    function draw(nextFrame: number) {
      if (!pixels || !columns || !rows) return;

      const width = canvasElement.clientWidth;
      const height = canvasElement.clientHeight;
      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      context.clearRect(0, 0, width, height);
      context.font = `500 ${Math.max(
        8,
        cellHeight * 0.88,
      )}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";

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
          const visibility = classicArtworkVisibility(brightness);
          if (visibility <= 0.01) continue;

          const cellIndex = row * columns + column;
          let character = renderedCharacters[cellIndex];
          if (
            !character ||
            shouldSampleClassicCharacter(column, row, nextFrame)
          ) {
            character = selectClassicCharacter(
              CLASSIC_ARTWORK_CHARACTERS,
              brightness,
              column,
              row,
              nextFrame,
            );
            renderedCharacters[cellIndex] = character;
          }
          const characterAlpha =
            sourceAlpha *
            0.48 *
            visibility *
            (0.55 + brightness * 0.45);
          const liftedRed = Math.min(255, red * 0.82 + 78);
          const liftedGreen = Math.min(255, green * 0.82 + 78);
          const liftedBlue = Math.min(255, blue * 0.82 + 88);

          context.fillStyle = `rgb(${liftedRed} ${liftedGreen} ${liftedBlue} / ${characterAlpha})`;
          context.fillText(
            character,
            (column + 0.5) * cellWidth,
            (row + 0.5) * cellHeight,
          );
        }
      }

      canvasElement.dataset.artworkFrame = String(nextFrame);
    }

    function prepare() {
      if (
        !imageElement.complete ||
        !imageElement.naturalWidth ||
        !imageElement.naturalHeight
      ) {
        return;
      }

      const bounds = rootElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      columns = Math.max(1, Math.ceil(bounds.width / 10));
      rows = Math.max(
        1,
        Math.ceil(bounds.height / (10 * GLYPH_ASPECT_RATIO)),
      );
      cellWidth = bounds.width / columns;
      cellHeight = bounds.height / rows;
      deviceScale = Math.min(window.devicePixelRatio || 1, 2);

      canvasElement.width = Math.round(bounds.width * deviceScale);
      canvasElement.height = Math.round(bounds.height * deviceScale);
      sampleCanvas.width = columns;
      sampleCanvas.height = rows;
      renderedCharacters = new Array(columns * rows);

      const source = getClassicCoverSourceRect(
        imageElement.naturalWidth,
        imageElement.naturalHeight,
        bounds.width / bounds.height,
      );
      sampleContext.clearRect(0, 0, columns, rows);
      sampleContext.drawImage(
        imageElement,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        columns,
        rows,
      );
      pixels = sampleContext.getImageData(0, 0, columns, rows).data;
      frame = reducedMotion.matches ? 0 : frame;
      draw(frame);
    }

    function animate(timestamp: number) {
      if (
        !reducedMotion.matches &&
        document.visibilityState === "visible" &&
        timestamp - lastFrameAt >= 220
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
    resizeObserver.observe(rootElement);
    imageElement.addEventListener("load", prepare);
    reducedMotion.addEventListener("change", motionPreferenceChanged);
    if (imageElement.complete) prepare();
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      imageElement.removeEventListener("load", prepare);
      reducedMotion.removeEventListener("change", motionPreferenceChanged);
    };
  }, [src]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className,
      )}
      data-artwork
      data-artwork-effect="ascii-classic"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the canvas samples this exact DOM image */}
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
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-2 size-full mix-blend-screen motion-reduce:opacity-72"
        data-artwork-canvas
        aria-hidden="true"
      />
    </div>
  );
}

export function getClassicCoverSourceRect(
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

export function selectClassicCharacter(
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
  return characters[
    Math.min(characters.length - 1, Math.max(0, baseIndex + variation))
  ];
}

export function classicArtworkVisibility(brightness: number) {
  const value = Math.min(1, Math.max(0, brightness));
  const progress = Math.min(
    1,
    Math.max(0, (value - BRIGHTNESS_THRESHOLD) / BRIGHTNESS_FEATHER),
  );
  return progress * progress * (3 - 2 * progress);
}

export function shouldSampleClassicCharacter(
  column: number,
  row: number,
  frame: number,
) {
  return (
    hashCell(column + 97, row + 193, frame) / 0x100000000 <
    SAMPLING_THRESHOLD
  );
}

function hashCell(column: number, row: number, frame: number) {
  let value =
    Math.imul(column + 1, 374761393) ^
    Math.imul(row + 1, 668265263) ^
    Math.imul(frame + 1, 2246822519);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}
