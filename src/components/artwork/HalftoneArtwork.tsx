"use client";

import type { CSSProperties } from "react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import { cn } from "@/lib/utils";

import {
  getHalftonePlaybackState,
  normalizeHalftoneConfig,
  type HalftoneConfig,
} from "./halftone";
import {
  createHalftoneCanvas2DRenderer,
  type HalftoneCanvas2DRenderer,
} from "./halftone-canvas2d";
import {
  createHalftoneWebGLRenderer,
  type HalftoneWebGLRenderer,
} from "./halftone-webgl";
import styles from "./HalftoneArtwork.module.css";

export {
  DEFAULT_HALFTONE_CONFIG,
  getHalftoneCellSize,
  getHalftonePlaybackState,
  hexToRgbUnit,
  normalizeHalftoneConfig,
} from "./halftone";
export type { HalftoneConfig } from "./halftone";

export type HalftoneArtworkProps = {
  className?: string;
  config?: Partial<HalftoneConfig>;
  paused?: boolean;
  style?: CSSProperties;
};

type LiveOptions = {
  config: HalftoneConfig;
  paused: boolean;
};

export function HalftoneArtwork({
  className,
  config,
  paused = false,
  style,
}: HalftoneArtworkProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
  const normalizedConfig = useMemo(
    () => normalizeHalftoneConfig(config),
    [config],
  );
  const liveOptionsRef = useRef<LiveOptions>({
    config: normalizedConfig,
    paused,
  });
  const invalidateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    liveOptionsRef.current = { config: normalizedConfig, paused };
    invalidateRef.current?.();
  }, [normalizedConfig, paused]);

  useEffect(() => {
    const root = rootRef.current;
    const webglCanvas = webglCanvasRef.current;
    const canvas2D = canvas2DRef.current;
    if (!root || !webglCanvas || !canvas2D) return;
    const rootElement = root;
    const webglCanvasElement = webglCanvas;
    const canvas2DElement = canvas2D;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const webglRenderer = createHalftoneWebGLRenderer(webglCanvasElement);
    let artworkRenderer:
      | HalftoneWebGLRenderer
      | HalftoneCanvas2DRenderer;
    let rendererKind: "webgl" | "canvas-2d";
    let activeCanvas: HTMLCanvasElement;

    if (webglRenderer) {
      artworkRenderer = webglRenderer;
      rendererKind = "webgl";
      activeCanvas = webglCanvasElement;
    } else {
      const canvas2DRenderer = createHalftoneCanvas2DRenderer(canvas2DElement);
      if (!canvas2DRenderer) {
        rootElement.dataset.halftoneRenderer = "fallback";
        rootElement.dataset.halftoneState = getHalftonePlaybackState(
          liveOptionsRef.current.paused,
          liveOptionsRef.current.config.animationSpeed,
          reducedMotion.matches,
        );
        webglCanvasElement.style.opacity = "0";
        canvas2DElement.style.opacity = "0";
        return;
      }
      artworkRenderer = canvas2DRenderer;
      rendererKind = "canvas-2d";
      activeCanvas = canvas2DElement;
    }

    function activateCanvas(canvas: HTMLCanvasElement) {
      webglCanvasElement.removeAttribute("data-halftone-canvas");
      canvas2DElement.removeAttribute("data-halftone-canvas");
      webglCanvasElement.style.opacity = "0";
      canvas2DElement.style.opacity = "0";
      canvas.dataset.halftoneCanvas = "";
    }

    activateCanvas(activeCanvas);

    let animationFrame: number | null = null;
    let frame = 0;
    let elapsedSeconds = 0;
    let lastTimestamp: number | null = null;
    let width = 0;
    let height = 0;
    let invalidated = true;
    let renderFailed = false;
    let lastCanvas2DRenderTimestamp: number | null = null;

    function schedule() {
      if (animationFrame === null && !renderFailed) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    }

    function invalidate() {
      invalidated = true;
      schedule();
    }
    invalidateRef.current = invalidate;

    function resize() {
      const bounds = rootElement.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      invalidate();
    }

    function draw(timestamp: number) {
      animationFrame = null;
      if (renderFailed) return;
      const { config: currentConfig, paused: currentlyPaused } =
        liveOptionsRef.current;
      const visible = document.visibilityState === "visible";
      const canAnimate =
        visible &&
        !reducedMotion.matches &&
        !currentlyPaused &&
        currentConfig.animationSpeed > 0;

      if (canAnimate) {
        if (lastTimestamp !== null) {
          const delta = Math.min(100, timestamp - lastTimestamp) / 1000;
          elapsedSeconds += delta * currentConfig.animationSpeed;
        }
        lastTimestamp = timestamp;
      } else {
        lastTimestamp = null;
      }

      if (
        rendererKind === "canvas-2d" &&
        canAnimate &&
        !invalidated &&
        lastCanvas2DRenderTimestamp !== null &&
        timestamp - lastCanvas2DRenderTimestamp < 50
      ) {
        schedule();
        return;
      }

      if (width > 0 && height > 0 && (canAnimate || invalidated)) {
        const rendered = artworkRenderer.render({
          width,
          height,
          time: reducedMotion.matches ? 0 : elapsedSeconds,
          config: currentConfig,
        });
        if (!rendered) {
          if (rendererKind === "webgl") {
            const canvas2DRenderer = createHalftoneCanvas2DRenderer(
              canvas2DElement,
            );
            if (canvas2DRenderer) {
              artworkRenderer.destroy();
              artworkRenderer = canvas2DRenderer;
              rendererKind = "canvas-2d";
              activeCanvas = canvas2DElement;
              lastCanvas2DRenderTimestamp = null;
              lastTimestamp = null;
              invalidated = true;
              activateCanvas(activeCanvas);
              schedule();
              return;
            }
          }
          renderFailed = true;
          rootElement.dataset.halftoneRenderer = "fallback";
          rootElement.dataset.halftoneState = getHalftonePlaybackState(
            currentlyPaused,
            currentConfig.animationSpeed,
            reducedMotion.matches,
          );
          activeCanvas.style.opacity = "0";
        } else {
          rootElement.dataset.halftoneRenderer = rendererKind;
          activeCanvas.style.opacity = "1";
          frame = reducedMotion.matches ? 0 : frame + 1;
          activeCanvas.dataset.halftoneFrame = String(frame);
          if (rendererKind === "canvas-2d") {
            lastCanvas2DRenderTimestamp = timestamp;
          }
          rootElement.dataset.halftoneState = getHalftonePlaybackState(
            currentlyPaused,
            currentConfig.animationSpeed,
            reducedMotion.matches,
          );
        }
        invalidated = false;
      }

      if (canAnimate) schedule();
    }

    function motionPreferenceChanged() {
      lastTimestamp = null;
      invalidate();
    }

    function visibilityChanged() {
      lastTimestamp = null;
      invalidate();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(rootElement);
    reducedMotion.addEventListener("change", motionPreferenceChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    resize();
    schedule();

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      resizeObserver.disconnect();
      reducedMotion.removeEventListener("change", motionPreferenceChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
      invalidateRef.current = null;
      artworkRenderer.destroy();
    };
  }, []);

  const fallbackCellSize = Math.max(2.5, 800 / normalizedConfig.dotDensity);
  const playbackState = getHalftonePlaybackState(
    paused,
    normalizedConfig.animationSpeed,
    reducedMotion,
  );
  const fallbackStyle: CSSProperties & Record<`--${string}`, string> = {
    "--halftone-fallback-cell-size": `${fallbackCellSize}px`,
    "--halftone-fallback-color-a": normalizedConfig.colorA,
    "--halftone-fallback-color-b": normalizedConfig.colorB,
    "--halftone-fallback-duration": `${14 / Math.max(normalizedConfig.animationSpeed, 0.05)}s`,
    "--halftone-fallback-play-state":
      paused || reducedMotion || normalizedConfig.animationSpeed === 0
        ? "paused"
        : "running",
    backgroundColor: normalizedConfig.background,
    ...style,
  };

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 isolate overflow-hidden",
        className,
      )}
      data-halftone-artwork=""
      data-halftone-balance={normalizedConfig.colorBalance}
      data-halftone-density={normalizedConfig.dotDensity}
      data-halftone-detail={normalizedConfig.swirlDetail}
      data-halftone-renderer="css"
      data-halftone-state={playbackState}
      style={fallbackStyle}
    >
      <span
        className={styles.fallback}
        data-halftone-fallback=""
      />
      <HalftoneSvgFallback
        config={normalizedConfig}
        paused={paused || reducedMotion}
      />
      <canvas
        ref={canvas2DRef}
        className="absolute inset-0 block size-full opacity-0"
        data-halftone-canvas-2d=""
        data-halftone-frame="0"
      />
      <canvas
        ref={webglCanvasRef}
        className="absolute inset-0 block size-full opacity-0"
        data-halftone-canvas=""
        data-halftone-frame="0"
        data-halftone-webgl-canvas=""
      />
    </div>
  );
}

function subscribeToReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function HalftoneSvgFallback({
  config,
  paused,
}: {
  config: HalftoneConfig;
  paused: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const smallPatternId = `${id}-small-dots`;
  const mediumPatternId = `${id}-medium-dots`;
  const largePatternId = `${id}-large-dots`;
  const flowFilterId = `${id}-flow-field`;
  const flowMaskId = `${id}-flow-mask`;
  const cellSize = Math.max(2.5, 900 / config.dotDensity);
  const duration = 14 / Math.max(config.animationSpeed, 0.05);
  const animating = !paused && config.animationSpeed > 0;
  const displacement = 105 + config.swirlDetail * 28;
  const patternTransform = `rotate(${config.patternAngle})`;

  return (
    <svg
      className={styles.noiseFallback}
      data-halftone-noise-fallback=""
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 1600 900"
    >
      <defs>
        <pattern
          height={cellSize}
          id={smallPatternId}
          patternTransform={patternTransform}
          patternUnits="userSpaceOnUse"
          width={cellSize}
        >
          <circle
            cx={cellSize / 2}
            cy={cellSize / 2}
            fill={config.colorB}
            r={cellSize * 0.055}
          />
        </pattern>
        <pattern
          height={cellSize}
          id={mediumPatternId}
          patternTransform={patternTransform}
          patternUnits="userSpaceOnUse"
          width={cellSize}
        >
          <circle
            cx={cellSize / 2}
            cy={cellSize / 2}
            fill={config.colorB}
            r={cellSize * 0.2}
          />
        </pattern>
        <pattern
          height={cellSize}
          id={largePatternId}
          patternTransform={patternTransform}
          patternUnits="userSpaceOnUse"
          width={cellSize}
        >
          <circle
            cx={cellSize / 2}
            cy={cellSize / 2}
            fill={config.colorA}
            r={cellSize * 0.34}
          />
        </pattern>
        <filter
          colorInterpolationFilters="sRGB"
          height="160%"
          id={flowFilterId}
          width="160%"
          x="-30%"
          y="-30%"
        >
          <feTurbulence
            baseFrequency="0.0024 0.0042"
            numOctaves="3"
            result="noise"
            seed="11"
            stitchTiles="stitch"
            type="fractalNoise"
          >
            {animating ? (
              <animate
                attributeName="baseFrequency"
                dur={`${duration}s`}
                repeatCount="indefinite"
                values="0.0024 0.0042;0.0048 0.0026;0.0031 0.0051;0.0024 0.0042"
              />
            ) : null}
          </feTurbulence>
          <feDisplacementMap
            in="noise"
            in2="noise"
            result="warpedNoise"
            scale={displacement}
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feOffset dx="0" dy="0" in="warpedNoise" result="flowingNoise">
            {animating ? (
              <>
                <animate
                  attributeName="dx"
                  dur={`${duration * 1.3}s`}
                  repeatCount="indefinite"
                  values="-120;95;-65;-120"
                />
                <animate
                  attributeName="dy"
                  dur={`${duration * 1.7}s`}
                  repeatCount="indefinite"
                  values="70;-80;45;70"
                />
              </>
            ) : null}
          </feOffset>
          <feComponentTransfer in="flowingNoise">
            <feFuncR amplitude="1.45" exponent="0.82" offset="-0.2" type="gamma" />
            <feFuncG amplitude="1.45" exponent="0.82" offset="-0.2" type="gamma" />
            <feFuncB amplitude="1.45" exponent="0.82" offset="-0.2" type="gamma" />
          </feComponentTransfer>
        </filter>
        <mask
          height="900"
          id={flowMaskId}
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
          width="1600"
          x="0"
          y="0"
        >
          <rect
            fill="#ffffff"
            filter={`url(#${flowFilterId})`}
            height="900"
            width="1600"
          />
        </mask>
      </defs>
      <rect fill={config.background} height="900" width="1600" />
      <rect fill={`url(#${smallPatternId})`} height="900" width="1600" />
      <rect
        fill={`url(#${mediumPatternId})`}
        height="900"
        mask={`url(#${flowMaskId})`}
        opacity="0.72"
        width="1600"
      />
      <rect
        fill={`url(#${largePatternId})`}
        height="900"
        mask={`url(#${flowMaskId})`}
        width="1600"
      />
    </svg>
  );
}
