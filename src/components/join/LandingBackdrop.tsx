"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import {
  LANDING_BACKGROUNDS,
  LANDING_BACKGROUND_SESSION_KEY,
  type LandingBackground,
} from "@/components/join/landingBackgrounds";

import styles from "./LandingBackdrop.module.css";

type RenderStatus = "idle" | "loading" | "ready" | "fallback";

function chooseBackground(): LandingBackground {
  try {
    const storedId = window.sessionStorage.getItem(
      LANDING_BACKGROUND_SESSION_KEY,
    );
    const stored = LANDING_BACKGROUNDS.find(
      (background) => background.id === storedId,
    );

    if (stored) {
      return stored;
    }

    const randomValue = new Uint32Array(1);
    window.crypto.getRandomValues(randomValue);
    const selected =
      LANDING_BACKGROUNDS[randomValue[0] % LANDING_BACKGROUNDS.length];
    window.sessionStorage.setItem(
      LANDING_BACKGROUND_SESSION_KEY,
      selected.id,
    );
    return selected;
  } catch {
    return LANDING_BACKGROUNDS[0];
  }
}

export function LandingBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [background, setBackground] = useState<LandingBackground | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [status, setStatus] = useState<RenderStatus>("idle");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setBackground(chooseBackground());
      setStatus("loading");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!background || !imageReady || !canvas || !image) {
      return;
    }

    const selectedBackground = background;
    const targetCanvas = canvas;
    const sourceImage = image;
    let disposed = false;

    async function renderAscii() {
      try {
        const { renderLandingAscii } = await import("./renderLandingAscii");
        renderLandingAscii(sourceImage, targetCanvas, selectedBackground.effect);
        if (!disposed) {
          setStatus("ready");
        }
      } catch {
        if (!disposed) {
          setStatus("fallback");
        }
      }
    }

    void renderAscii();

    return () => {
      disposed = true;
    };
  }, [background, imageReady]);

  if (!background) {
    return (
      <div
        aria-hidden="true"
        className={styles.backdrop}
        data-landing-background
        data-landing-background-status="idle"
      />
    );
  }

  const backdropStyle = {
    "--landing-background": background.effect.backgroundColor,
  } as CSSProperties;
  const mediaStyle = { objectPosition: background.objectPosition };
  const rendered = status === "ready";

  return (
    <>
      <div
        aria-hidden="true"
        className={styles.backdrop}
        data-landing-background
        data-landing-background-id={background.id}
        data-landing-background-status={status}
        style={backdropStyle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className={`${styles.source} ${rendered ? styles.sourceHidden : ""}`}
          crossOrigin="anonymous"
          fetchPriority="high"
          onError={() => setStatus("fallback")}
          onLoad={() => setImageReady(true)}
          ref={imageRef}
          src={background.imageUrl}
          style={mediaStyle}
        />
        <canvas
          className={`${styles.canvas} ${rendered ? styles.canvasReady : ""}`}
          ref={canvasRef}
          style={mediaStyle}
        />
        <span className={styles.wash} />
      </div>
      <p className={styles.credit}>
        Photo by{" "}
        <a
          href={background.photographerUrl}
          rel="noreferrer"
          target="_blank"
        >
          {background.photographerName}
        </a>{" "}
        on{" "}
        <a href={background.photoUrl} rel="noreferrer" target="_blank">
          Unsplash
        </a>
      </p>
    </>
  );
}
