import type canvasConfetti from "canvas-confetti";

export const MISSION_COMPLETE_COLORS = [
  "#5146d9",
  "#f45c93",
  "#3d9df2",
  "#46b98c",
  "#f6c94c",
  "#ffffff",
] as const;

export const MISSION_COMPLETE_SHAPES = ["circle", "square", "star"] as const;

type Confetti = typeof canvasConfetti;

export function playMissionCompleteDecoration(confetti: Confetti): void {
  const options = {
    particleCount: 60,
    spread: 70,
    startVelocity: 42,
    gravity: 0.95,
    ticks: 170,
    colors: [...MISSION_COMPLETE_COLORS],
    shapes: [...MISSION_COMPLETE_SHAPES],
    disableForReducedMotion: true,
    zIndex: 1000,
  };

  confetti({
    ...options,
    angle: 60,
    origin: { x: 0, y: 1 },
  });
  confetti({
    ...options,
    angle: 120,
    origin: { x: 1, y: 1 },
  });
}
