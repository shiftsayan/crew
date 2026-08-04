"use client";

import type canvasConfetti from "canvas-confetti";
import { useEffect } from "react";

import { startLevelCompleteCelebration } from "@/components/celebration/celebration-coordinator";
import { playMissionCompleteDecoration } from "@/components/celebration/mission-complete-decoration";

import { BugDecoration } from "./BugDecoration";

type MissionRoomDecorationsProps = {
  roomId: string;
  attemptNumber: number;
  active: boolean;
  bugTriggerId?: never;
  trigger?: never;
};

export type RoomDecorationTrigger = {
  id: number;
  kind: "bug" | "mission-complete";
};

type PreviewRoomDecorationsProps = {
  active?: never;
  attemptNumber?: never;
  roomId?: never;
  bugTriggerId: number | null;
  trigger: RoomDecorationTrigger | null;
};

type RoomDecorationsProps =
  | MissionRoomDecorationsProps
  | PreviewRoomDecorationsProps;

let confettiPromise: Promise<typeof canvasConfetti> | null = null;

function loadCanvasConfetti() {
  confettiPromise ??= import("canvas-confetti")
    .then((module) => module.default)
    .catch((error: unknown) => {
      confettiPromise = null;
      throw error;
    });
  return confettiPromise;
}

export function RoomDecorations(props: RoomDecorationsProps) {
  if ("trigger" in props) {
    return (
      <PreviewRoomDecorations
        bugTriggerId={props.bugTriggerId ?? null}
        trigger={props.trigger ?? null}
      />
    );
  }

  return <MissionRoomDecorations {...props} />;
}

function MissionRoomDecorations({
  roomId,
  attemptNumber,
  active,
}: MissionRoomDecorationsProps) {
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

function PreviewRoomDecorations({
  bugTriggerId,
  trigger,
}: Pick<PreviewRoomDecorationsProps, "bugTriggerId" | "trigger">) {
  useEffect(() => {
    if (!trigger || trigger.kind !== "mission-complete") return;

    let disposed = false;
    let confetti: Awaited<ReturnType<typeof loadCanvasConfetti>> | null = null;

    void loadCanvasConfetti()
      .then((loadedConfetti) => {
        if (disposed) {
          loadedConfetti.reset();
          return;
        }

        confetti = loadedConfetti;
        playMissionCompleteDecoration(loadedConfetti);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      confetti?.reset();
    };
  }, [trigger]);

  return (
    <>
      {bugTriggerId !== null ? (
        <BugDecoration key={bugTriggerId} triggerId={bugTriggerId} />
      ) : null}
    </>
  );
}
