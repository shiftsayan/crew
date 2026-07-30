"use client";

import { useEffect } from "react";

import { startLevelCompleteCelebration } from "./celebration-coordinator";

type LevelCompleteCelebrationProps = {
  roomId: string;
  attemptNumber: number;
  active: boolean;
};

async function loadCanvasConfetti() {
  return (await import("canvas-confetti")).default;
}

export function LevelCompleteCelebration({
  roomId,
  attemptNumber,
  active,
}: LevelCompleteCelebrationProps) {
  useEffect(() => {
    return startLevelCompleteCelebration({
      active,
      attemptNumber,
      loadConfetti: loadCanvasConfetti,
      roomId,
      storage: window.sessionStorage,
    });
  }, [active, attemptNumber, roomId]);

  return null;
}
