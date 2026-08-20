"use client";

import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft, Pause, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { HalftoneArtwork } from "./HalftoneArtwork";
import {
  DEFAULT_HALFTONE_CONFIG,
  type HalftoneConfig,
} from "./halftone";
import styles from "./HalftoneArtworkLab.module.css";

const referenceUrl =
  "https://shaders.com/collection/halftone-swirl/081efdc7-edc4-4e7c-b364-f836c1dac0de";

export function HalftoneArtworkLab() {
  const [config, setConfig] = useState<HalftoneConfig>(() => ({
    ...DEFAULT_HALFTONE_CONFIG,
  }));
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const speedIsZero = config.animationSpeed === 0;
  const playbackLabel = reducedMotion
    ? "Reduced"
    : paused
      ? "Paused"
      : speedIsZero
        ? "Still"
        : "Live";
  const animationIsPlaying = !reducedMotion && !paused && !speedIsZero;

  useEffect(() => {
    const sharedArtwork = document.querySelector<HTMLElement>(
      "body > [data-artwork]",
    );
    if (!sharedArtwork) return;
    const wasHidden = sharedArtwork.hidden;
    sharedArtwork.hidden = true;
    return () => {
      sharedArtwork.hidden = wasHidden;
    };
  }, []);

  function update<K extends keyof HalftoneConfig>(
    key: K,
    value: HalftoneConfig[K],
  ) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function reset<K extends keyof HalftoneConfig>(key: K) {
    update(key, DEFAULT_HALFTONE_CONFIG[key]);
  }

  function resetAll() {
    setConfig({ ...DEFAULT_HALFTONE_CONFIG });
    setPaused(false);
  }

  function togglePlayback() {
    if (reducedMotion) return;
    if (paused) {
      setPaused(false);
      return;
    }
    if (speedIsZero) {
      update("animationSpeed", DEFAULT_HALFTONE_CONFIG.animationSpeed);
      return;
    }
    setPaused(true);
  }

  return (
    <main
      className="relative z-20 h-dvh overflow-hidden bg-[#0b0910] text-[#f6f4fb]"
      id="main-content"
    >
      <header className="flex h-14 items-center gap-3 border-b border-white/8 bg-[#0d0b12] px-3 sm:px-5">
        <Button
          asChild
          className="border-white/10 bg-white/4 text-white hover:bg-white/9 hover:text-white"
          size="icon-sm"
          variant="outline"
        >
          <Link aria-label="Back to Crew" href="/">
            <ChevronLeft aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="m-0 font-mono text-[10px] leading-3 tracking-[0.16em] text-white/45 uppercase">
            Artwork lab
          </p>
          <h1 className="m-0 truncate text-sm font-medium sm:text-base">
            Halftone swirl
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-white/55 uppercase sm:flex"
            data-halftone-playback-status=""
          >
            <span
              className={`size-1.5 rounded-full ${animationIsPlaying ? "bg-emerald-400" : "bg-amber-400"}`}
              aria-hidden="true"
            />
            {playbackLabel}
          </span>
          <Button
            aria-label={
              reducedMotion
                ? "Animation disabled by reduced motion"
                : animationIsPlaying
                  ? "Pause animation"
                  : "Play animation"
            }
            className="border-white/10 bg-white/4 text-white hover:bg-white/9 hover:text-white"
            disabled={reducedMotion}
            onClick={togglePlayback}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            {animationIsPlaying ? (
              <Pause aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
          </Button>
          <Button
            aria-label="Reset all controls"
            className="border-white/10 bg-white/4 text-white hover:bg-white/9 hover:text-white"
            onClick={resetAll}
            size="sm"
            type="button"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </header>

      <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden">
        <section
          aria-labelledby="halftone-preview-title"
          className="flex min-h-88 items-center justify-center bg-[#09070d] p-3 sm:min-h-120 sm:p-6 lg:min-h-0 lg:overflow-auto lg:p-8"
        >
          <h2 className="sr-only" id="halftone-preview-title">
            Halftone swirl preview
          </h2>
          <figure className="m-0 w-full max-w-6xl">
            <div
              className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-[#200452] shadow-[0_28px_80px_rgb(0_0_0/45%)]"
              data-halftone-viewport=""
            >
              <HalftoneArtwork config={config} paused={paused} />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
                <span className="rounded-md border border-white/10 bg-black/35 px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-white/60 uppercase backdrop-blur-sm">
                  Procedural · 16:9
                </span>
              </div>
            </div>
            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] tracking-[0.08em] text-white/55 uppercase">
              <span>Procedural · no source image</span>
              <a
                className="rounded-sm underline decoration-white/20 underline-offset-4 hover:text-white/70"
                href={referenceUrl}
                rel="noreferrer"
                target="_blank"
              >
                Reference: Halftone Swirl 1
              </a>
            </figcaption>
          </figure>
        </section>

        <aside
          aria-label="Halftone controls"
          className="border-t border-white/8 bg-[#121016] lg:min-h-0 lg:overflow-y-auto lg:border-t-0 lg:border-l"
        >
          <div className="border-b border-white/8 px-4 py-4">
            <p className="m-0 font-mono text-[10px] tracking-[0.16em] text-white/52 uppercase">
              Inspector
            </p>
            <h2 className="mt-1 mb-0 text-base font-medium">Configuration</h2>
            <p className="mt-1 mb-0 text-xs leading-5 text-white/45">
              Public controls and defaults mirror the reference preview.
            </p>
          </div>

          <form
            className="divide-y divide-white/8"
            onSubmit={(event: FormEvent) => event.preventDefault()}
          >
            <ControlSection legend="Palette">
              <ColorControl
                defaultValue={DEFAULT_HALFTONE_CONFIG.background}
                label="Background"
                onChange={(value) => update("background", value)}
                onReset={() => reset("background")}
                value={config.background}
              />
              <ColorControl
                defaultValue={DEFAULT_HALFTONE_CONFIG.colorA}
                label="Swirl color A"
                onChange={(value) => update("colorA", value)}
                onReset={() => reset("colorA")}
                value={config.colorA}
              />
              <ColorControl
                defaultValue={DEFAULT_HALFTONE_CONFIG.colorB}
                label="Swirl color B"
                onChange={(value) => update("colorB", value)}
                onReset={() => reset("colorB")}
                value={config.colorB}
              />
            </ControlSection>

            <ControlSection legend="Halftone">
              <RangeControl
                defaultValue={DEFAULT_HALFTONE_CONFIG.dotDensity}
                label="Dot density"
                max={300}
                min={10}
                onChange={(value) => update("dotDensity", value)}
                onReset={() => reset("dotDensity")}
                step={1}
                value={config.dotDensity}
              />
              <RangeControl
                defaultValue={DEFAULT_HALFTONE_CONFIG.patternAngle}
                label="Pattern angle"
                max={360}
                min={0}
                onChange={(value) => update("patternAngle", value)}
                onReset={() => reset("patternAngle")}
                step={1}
                unit="°"
                value={config.patternAngle}
              />
            </ControlSection>

            <ControlSection legend="Swirl">
              <RangeControl
                defaultValue={DEFAULT_HALFTONE_CONFIG.colorBalance}
                label="Color balance"
                max={100}
                min={0}
                onChange={(value) => update("colorBalance", value)}
                onReset={() => reset("colorBalance")}
                step={1}
                unit="%"
                value={config.colorBalance}
              />
              <RangeControl
                defaultValue={DEFAULT_HALFTONE_CONFIG.swirlDetail}
                label="Swirl detail"
                max={5}
                min={0}
                onChange={(value) => update("swirlDetail", value)}
                onReset={() => reset("swirlDetail")}
                step={0.1}
                value={config.swirlDetail}
              />
            </ControlSection>

            <ControlSection legend="Animation">
              <RangeControl
                defaultValue={DEFAULT_HALFTONE_CONFIG.animationSpeed}
                label="Animation speed"
                max={5}
                min={0}
                onChange={(value) => update("animationSpeed", value)}
                onReset={() => reset("animationSpeed")}
                step={0.05}
                unit="×"
                value={config.animationSpeed}
              />
              <p className="m-0 text-[11px] leading-4 text-white/55">
                Motion also pauses when this tab is hidden and renders a still
                frame when reduced motion is enabled.
              </p>
            </ControlSection>
          </form>
        </aside>
      </div>
    </main>
  );
}

function ControlSection({
  children,
  legend,
}: {
  children: ReactNode;
  legend: string;
}) {
  return (
    <fieldset className="space-y-4 px-4 py-5">
      <legend className="px-0 font-mono text-[10px] tracking-[0.16em] text-white/52 uppercase">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

function ColorControl({
  defaultValue,
  label,
  onChange,
  onReset,
  value,
}: {
  defaultValue: string;
  label: string;
  onChange: (value: string) => void;
  onReset: () => void;
  value: string;
}) {
  const id = useId();
  const changed = value !== defaultValue;

  function commit(rawValue: string, input: HTMLInputElement) {
    const normalized = rawValue.startsWith("#") ? rawValue : `#${rawValue}`;
    if (/^#[\da-f]{6}$/i.test(normalized)) {
      onChange(normalized.toLowerCase());
      return;
    }
    input.value = value.slice(1).toUpperCase();
  }

  return (
    <div className="space-y-1.5">
      <div className="flex min-h-5 items-center gap-2">
        <label className="text-xs font-medium text-white/68" htmlFor={id}>
          {label}
        </label>
        {changed ? (
          <ResetControl label={label} onReset={onReset} />
        ) : null}
      </div>
      <div className="flex h-9 items-center rounded-md border border-white/8 bg-white/4 p-1 focus-within:border-blue-400/60 focus-within:ring-2 focus-within:ring-blue-400/18">
        <span
          className="relative size-7 shrink-0 overflow-hidden rounded border border-white/12 shadow-inner"
          style={{ backgroundColor: value }}
        >
          <input
            aria-label={`${label} color picker`}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            id={id}
            onChange={(event) => onChange(event.currentTarget.value)}
            type="color"
            value={value}
          />
        </span>
        <span className="pl-2 font-mono text-[11px] text-white/32">#</span>
        <input
          key={value}
          aria-label={`${label} hex value`}
          className="h-full min-w-0 flex-1 bg-transparent px-1 font-mono text-xs tracking-[0.08em] text-white/72 uppercase outline-none"
          defaultValue={value.slice(1).toUpperCase()}
          maxLength={7}
          onBlur={(event) => commit(event.currentTarget.value, event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          spellCheck={false}
          type="text"
        />
      </div>
    </div>
  );
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
}

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function RangeControl({
  defaultValue,
  label,
  max,
  min,
  onChange,
  onReset,
  step,
  unit = "",
  value,
}: {
  defaultValue: number;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  onReset: () => void;
  step: number;
  unit?: string;
  value: number;
}) {
  const id = useId();
  const percentage = ((value - min) / (max - min)) * 100;

  function change(rawValue: number) {
    if (!Number.isFinite(rawValue)) return;
    onChange(Math.min(max, Math.max(min, rawValue)));
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-5 items-center gap-2">
        <label className="text-xs font-medium text-white/68" htmlFor={id}>
          {label}
        </label>
        {value !== defaultValue ? (
          <ResetControl label={label} onReset={onReset} />
        ) : null}
      </div>
      <div className="flex items-center gap-3 rounded-md border border-white/8 bg-white/4 px-3 py-2.5">
        <input
          aria-valuetext={`${value}${unit}`}
          className={styles.range}
          id={id}
          max={max}
          min={min}
          onChange={(event) => change(event.currentTarget.valueAsNumber)}
          step={step}
          style={{ "--range-position": `${percentage}%` } as CSSProperties}
          type="range"
          value={value}
        />
        <div className="flex h-7 w-16 shrink-0 items-center rounded border border-white/8 bg-black/18 px-2 focus-within:border-blue-400/60 focus-within:ring-2 focus-within:ring-blue-400/18">
          <input
            aria-label={`${label} numeric value`}
            className="min-w-0 flex-1 bg-transparent text-right font-mono text-[11px] text-white/72 outline-none"
            max={max}
            min={min}
            onChange={(event) => change(event.currentTarget.valueAsNumber)}
            step={step}
            type="number"
            value={value}
          />
          {unit ? (
            <span className="ml-0.5 font-mono text-[10px] text-white/32">
              {unit}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ResetControl({
  label,
  onReset,
}: {
  label: string;
  onReset: () => void;
}) {
  return (
    <button
      aria-label={`Reset ${label}`}
      className="ml-auto rounded-sm p-1 text-white/55 transition-colors hover:bg-white/6 hover:text-white/72 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
      onClick={onReset}
      type="button"
    >
      <RotateCcw aria-hidden="true" className="size-3" />
    </button>
  );
}
