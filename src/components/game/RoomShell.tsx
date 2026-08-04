"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { EllipsisVertical, LogOut, Play } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import { Button } from "@/components/ui/button";
import { CrewEdition } from "@/components/ui/CrewEdition";
import { CrewLogo } from "@/components/ui/CrewLogo";
import { Progress } from "@/components/ui/progress";
import { CARD_DECK } from "@/game/config/cards";
import { cn } from "@/lib/utils";

import { GameCard } from "./GameCard";
import { RoomDecorations } from "./RoomDecorations";
import { TaskBoot } from "./TaskBoot";
import { TaskTile } from "./TaskTile";
import type {
  ActorProjection,
  Card,
  CommunicationQualifier,
  PlayerCommand,
} from "./types";

export type RoomShellImplProps = {
  announcement?: ReactNode;
  console: ReactNode;
  decorations?: ReactNode;
  dock?: ReactNode;
};

type RoomShellProps = {
  projection: ActorProjection;
  connection:
    | "loading"
    | "connected"
    | "reconnecting"
    | "unauthorized"
    | "not-found"
    | "restart-required";
  message: string;
  actionPending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
  onForget: () => void;
};

const phaseCallouts: Record<
  ActorProjection["phase"],
  { name: string; instructions: string }
> = {
  preflight: {
    name: "Waiting for launch.",
    instructions: "When everyone is ready, start the mission.",
  },
  "assigning-tasks": {
    name: "Assigning tasks.",
    instructions:
      "Select any unassigned task. Click one of yours again to deselect it.",
  },
  "ready-to-start-trick": {
    name: "Tasks assigned.",
    instructions:
      "Review assignments. Deselect one of yours, or start the first trick.",
  },
  "between-tricks": {
    name: "Between tricks.",
    instructions:
      "Set task statuses, communicate, play a lead card, or start the trick.",
  },
  "playing-trick": {
    name: "Playing a trick.",
    instructions: "Play on your turn and follow the lead suit if you can.",
  },
  adjudicating: {
    name: "Resolving the mission.",
    instructions: "Mark every remaining task.",
  },
  finished: {
    name: "Mission finished.",
    instructions: "Review the result; an admin can reset or advance.",
  },
};

const qualifierCopy: Record<CommunicationQualifier, string> = {
  highest: "Highest",
  only: "Only",
  lowest: "Lowest",
};

const cardsById = new Map(CARD_DECK.map((card) => [card.id, card]));
const playDropId = "crew:play-card";
const communicationDropId = "crew:communicate-card";
const reconnectingMessage =
  "Connection interrupted. Showing the latest confirmed state while we retry.";

type CardId = Card["id"];

function projectedCard(cardId: string | null | undefined): Card | null {
  if (!cardId) return null;
  return cardsById.get(cardId as Card["id"]) ?? null;
}

export function RoomConsoleImpl({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      aria-label="Game console"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white/95 backdrop-blur-lg",
        className,
      )}
      {...props}
    />
  );
}

export const RoomDockImpl = forwardRef<
  HTMLElement,
  ComponentPropsWithoutRef<"section">
>(function RoomDockImpl({ className, ...props }, ref) {
  return (
    <section
      aria-label="Room dock"
      className={cn(
        "relative flex h-32 min-h-0 flex-none basis-32 flex-col overflow-visible rounded-2xl bg-white/70 px-4 py-2 backdrop-blur-lg max-[700px]:z-10 max-[700px]:px-2",
        className,
      )}
      ref={ref}
      tabIndex={-1}
      {...props}
    />
  );
});

export function RoomShellImpl({
  announcement,
  console,
  decorations,
  dock,
}: RoomShellImplProps) {
  return (
    <div className="game-page relative isolate h-dvh min-h-0 w-full min-w-80 overflow-hidden text-crew-ink [--shell-gap:2rem] max-[700px]:[--shell-gap:0.5rem] max-[520px]:[--shell-gap:0.35rem]">
      {decorations}

      <main
        className="absolute inset-0 z-1 m-auto flex h-full max-h-216 min-h-0 w-full max-w-8xl flex-col gap-(--shell-gap) overflow-hidden p-(--shell-gap)"
        id="main-content"
      >
        {console}
        {dock ?? <RoomDockImpl aria-hidden="true" />}
      </main>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}

export function RoomShell({
  projection,
  connection,
  message,
  actionPending,
  sendCommand,
  onForget,
}: RoomShellProps) {
  const dockScope = `${projection.mission.attemptNumber}:${phaseViewScope(projection.phase)}`;
  const handScope = `${projection.room.id}:${projection.self.id}:${projection.mission.attemptNumber}`;
  const [communicationState, setCommunicationState] = useState<{
    scope: string;
    mode: boolean;
    cardId: CardId | null;
  }>(() => ({ scope: handScope, mode: false, cardId: null }));
  const [draggedCardId, setDraggedCardId] = useState<CardId | null>(null);
  const [interactionAnnouncement, setInteractionAnnouncement] = useState("");
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );
  const communicationMode =
    communicationState.scope === handScope && communicationState.mode;
  const communicatingCardId =
    communicationState.scope === handScope
      ? communicationState.cardId
      : null;
  const draggedCard = projectedCard(draggedCardId);
  const won = projection.phase === "finished" && projection.result === "won";
  const connectionToastId = `room-connection:${projection.room.id}`;
  const messageToastId = `room-message:${projection.room.id}`;

  useEffect(() => {
    if (connection === "reconnecting") {
      toast.warning(message || reconnectingMessage, {
        id: connectionToastId,
        duration: Infinity,
      });
      return;
    }

    toast.dismiss(connectionToastId);
  }, [connection, connectionToastId, message]);

  useEffect(() => {
    if (message && connection !== "reconnecting") {
      toast.warning(message, {
        id: messageToastId,
        duration: 5_000,
      });
    }
  }, [connection, message, messageToastId]);

  useEffect(() => {
    return () => {
      toast.dismiss(connectionToastId);
      toast.dismiss(messageToastId);
    };
  }, [connectionToastId, messageToastId]);

  function handleDragStart({ active }: DragStartEvent) {
    const card = projection.self.hand.find(
      (candidate) => candidate.id === active.id,
    );
    if (!card) return;

    setDraggedCardId(card.id);
    setInteractionAnnouncement(
      `Dragging ${cardName(card)}. Drop it on your played or communication station.`,
    );
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const card = projection.self.hand.find(
      (candidate) => candidate.id === active.id,
    );
    setDraggedCardId(null);

    if (!card || !over || actionPending) {
      setInteractionAnnouncement(card ? `${cardName(card)} returned to your hand.` : "");
      return;
    }

    if (
      over.id === playDropId &&
      projection.legalActions.playableCardIds.includes(card.id)
    ) {
      setInteractionAnnouncement(`Playing ${cardName(card)}.`);
      void sendCommand({ type: "play-card", cardId: card.id }).then((sent) => {
        setInteractionAnnouncement(
          sent
            ? `${cardName(card)} played.`
            : `${cardName(card)} could not be played.`,
        );
      });
      return;
    }

    if (
      over.id === communicationDropId &&
      projection.legalActions.communicationOptions.some(
        (option) => option.cardId === card.id,
      )
    ) {
      setCommunicationState({
        scope: handScope,
        mode: true,
        cardId: card.id,
      });
      setInteractionAnnouncement(
        `Choose how to communicate ${cardName(card)}.`,
      );
      return;
    }

    setInteractionAnnouncement(`${cardName(card)} returned to your hand.`);
  }

  function handleDragCancel() {
    const card = projectedCard(draggedCardId);
    setDraggedCardId(null);
    setInteractionAnnouncement(
      card ? `Stopped dragging ${cardName(card)}.` : "Card drag cancelled.",
    );
  }

  return (
    <DndContext
      collisionDetection={pointerWithin}
      sensors={sensors}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <RoomShellImpl
        decorations={
          <RoomDecorations
            roomId={projection.room.id}
            attemptNumber={projection.mission.attemptNumber}
            active={won}
          />
        }
        console={
          <RoomConsole
            projection={projection}
            pending={actionPending}
            draggedCard={draggedCard}
            sendCommand={sendCommand}
            onForget={onForget}
          />
        }
        dock={
          <RoomDock
            key={dockScope}
            projection={projection}
            hand={projection.self.hand}
            pending={actionPending}
            communicationMode={communicationMode}
            communicatingCardId={communicatingCardId}
            sendCommand={sendCommand}
            onCommunicationChange={(mode, cardId) =>
              setCommunicationState({ scope: handScope, mode, cardId })
            }
          />
        }
        announcement={
          actionPending ? "Sending action" : interactionAnnouncement
        }
      />
      <DragOverlay dropAnimation={null}>
        {draggedCard ? (
          <div aria-hidden="true" className="rotate-2 opacity-95 shadow-xl">
            <GameCard card={draggedCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function RoomConsole({
  projection,
  pending,
  draggedCard,
  sendCommand,
  onForget,
}: {
  projection: ActorProjection;
  pending: boolean;
  draggedCard: Card | null;
  sendCommand: RoomShellProps["sendCommand"];
  onForget: () => void;
}) {
  const crewIsPrimary = projection.phase === "playing-trick";

  return (
    <RoomConsoleImpl className={crewIsPrimary ? undefined : "pb-6"}>
      <div
        className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_16rem] gap-6 overflow-hidden p-6 min-[701px]:max-[1100px]:grid-cols-[minmax(0,1fr)_14rem] max-[700px]:flex max-[700px]:flex-1 max-[700px]:flex-col max-[700px]:gap-2 min-[701px]:[@media(max-height:720px)]:gap-4"
        data-slot="game-console-layout"
      >
        {crewIsPrimary ? (
          <CrewPanels
            projection={projection}
            layout="main"
            pending={pending}
            draggedCard={draggedCard}
            sendCommand={sendCommand}
          />
        ) : (
          <GameView
            projection={projection}
            pending={pending}
            sendCommand={sendCommand}
          />
        )}
        <MissionSidebar
          projection={projection}
          pending={pending}
          sendCommand={sendCommand}
          onForget={onForget}
        />
      </div>

      {crewIsPrimary ? null : (
        <CrewPanels
          projection={projection}
          layout={
            projection.phase === "between-tricks" ? "compact" : "strip"
          }
          pending={pending}
          draggedCard={draggedCard}
          sendCommand={sendCommand}
        />
      )}
    </RoomConsoleImpl>
  );
}

function GameView({
  projection,
  pending,
  sendCommand,
}: {
  projection: ActorProjection;
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  let content: ReactNode = null;

  if (projection.phase === "finished") {
    content = <ResultView projection={projection} />;
  } else if (
    projection.phase === "assigning-tasks" ||
    projection.phase === "ready-to-start-trick" ||
    projection.phase === "between-tricks" ||
    projection.phase === "adjudicating"
  ) {
    content = (
      <TaskBoard projection={projection} pending={pending} sendCommand={sendCommand} />
    );
  }

  return (
    <section
      className="min-h-0 min-w-0 overflow-auto p-2 max-[700px]:flex-1 max-[700px]:p-0"
      aria-label="Mission board"
      data-game-surface={projection.phase}
    >
      {content}
    </section>
  );
}

function ResultView({ projection }: { projection: ActorProjection }) {
  const won = projection.result === "won";
  return (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-auto p-8 text-center max-[520px]:p-5">
      <span
        className={cn(
          "grid size-14 place-items-center rounded-full bg-emerald-500 text-[1.8rem] font-bold text-white",
          !won && "bg-red-600",
        )}
        aria-hidden="true"
      >
        {won ? "✓" : "×"}
      </span>
      <p className="mt-4! mb-0 text-xs font-bold tracking-[0.06em] text-emerald-700! uppercase">
        {won ? "Level complete" : "Attempt complete"}
      </p>
      <h1 className="mt-3 mb-2 text-[1.35rem] tracking-normal">
        {won ? "Mission complete" : "Mission unsuccessful"}
      </h1>
      <p className="m-0 max-w-lg text-gray-600">
        {won
          ? `The crew completed Mission ${projection.mission.number}.`
          : "The room admin can return the room to preflight when the crew is ready."}
      </p>
      {projection.tasks.length ? (
        <div
          className="mt-4 flex max-w-full flex-wrap justify-center gap-[0.15rem]"
          aria-label="Task results"
        >
          {projection.tasks.map((task) => (
            <TaskTile
              key={task.id}
              task={task}
              card={projectedCard(task.cardId)}
              ownerName={task.ownerDisplayName}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskBoard({
  projection,
  pending,
  sendCommand,
}: {
  projection: ActorProjection;
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  const isAssigning = projection.phase === "assigning-tasks";
  const showTaskInfo =
    projection.mission.editionKey === "deep-sea" &&
    (isAssigning || projection.phase === "ready-to-start-trick");
  const visibleTasks = isAssigning
    ? projection.tasks.filter((task) => task.ownerPlayerId === null)
    : projection.tasks;

  if (!projection.tasks.length) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-auto p-8 text-center max-[520px]:p-5">
        <h1 className="mt-3 mb-2 text-[1.35rem] tracking-normal">
          Manual mission
        </h1>
        <p className="m-0 max-w-lg text-gray-600">
          Use the printed mission rule, then record the outcome in the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ul
        className="m-0 flex min-h-0 flex-1 list-none flex-wrap content-center justify-center gap-x-6 gap-y-3 overflow-auto p-6 max-[520px]:gap-2 max-[520px]:px-[0.15rem] max-[520px]:py-3"
        aria-label={isAssigning ? "Unassigned tasks" : "Tasks"}
      >
        {visibleTasks.map((task) => {
          const owner = projection.players.find((player) => player.id === task.ownerPlayerId);
          const claimable = projection.legalActions.claimableTaskIds.includes(task.id);
          const releasable = projection.legalActions.releasableTaskIds.includes(task.id);
          const canResolve = projection.legalActions.taskOutcomeTaskIds.includes(task.id);
          const selectionBoot =
            showTaskInfo && (claimable || releasable) ? (
              <TaskBoot emphasized={isAssigning} showInfo task={task} />
            ) : undefined;
          const tile = (
            <TaskTile
              task={task}
              card={projectedCard(task.cardId)}
              ownerName={owner?.displayName ?? null}
              emphasized={isAssigning}
              showBoot={!selectionBoot}
            />
          );

          if (isAssigning) {
            return (
              <li className="grid justify-items-center" key={task.id}>
                {claimable ? (
                  <TaskSelectionButton
                    action="claim"
                    pending={pending}
                    sendCommand={sendCommand}
                    task={task}
                    boot={selectionBoot}
                  >
                    {tile}
                  </TaskSelectionButton>
                ) : (
                  <TaskTile
                    task={task}
                    card={projectedCard(task.cardId)}
                    ownerName={owner?.displayName ?? null}
                    emphasized
                    showInfo={showTaskInfo}
                  />
                )}
              </li>
            );
          }

          return (
            <li className="grid justify-items-center" key={task.id}>
              {releasable ? (
                <TaskSelectionButton
                  action="release"
                  pending={pending}
                  sendCommand={sendCommand}
                  task={task}
                  boot={selectionBoot}
                >
                  {tile}
                </TaskSelectionButton>
              ) : (
                <TaskTile
                  task={task}
                  card={projectedCard(task.cardId)}
                  ownerName={owner?.displayName ?? null}
                  showInfo={showTaskInfo}
                  action={
                    canResolve ? (
                      <TaskOutcomeActions
                        task={task}
                        pending={pending}
                        sendCommand={sendCommand}
                      />
                    ) : undefined
                  }
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TaskSelectionButton({
  action,
  task,
  pending,
  sendCommand,
  children,
  boot,
}: {
  action: "claim" | "release";
  task: ActorProjection["tasks"][number];
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
  children: ReactNode;
  boot?: ReactNode;
}) {
  const isClaim = action === "claim";

  const selectionButton = (
    <button
      className={cn(
        "cursor-pointer rounded-md border-0 bg-transparent p-0 text-inherit focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-task-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        boot && "*:data-task-outcome:pb-0",
      )}
      type="button"
      disabled={pending}
      aria-label={isClaim ? `Assign ${task.title} to me` : `Deselect ${task.title}`}
      onClick={() =>
        void sendCommand(
          isClaim
            ? { type: "claim-task", taskId: task.id }
            : { type: "release-task", taskId: task.id },
        )
      }
    >
      {children}
    </button>
  );

  if (!boot) return selectionButton;

  return (
    <div className="inline-grid justify-items-center">
      {selectionButton}
      {boot}
    </div>
  );
}

function TaskOutcomeActions({
  task,
  pending,
  sendCommand,
}: {
  task: ActorProjection["tasks"][number];
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  return (
    <span className="flex gap-1" role="group" aria-label={`Resolve ${task.title}`}>
      <button
        className="min-h-11 min-w-11 rounded-md border-0 bg-gray-200 p-[0.35rem] text-[0.7rem] font-bold text-gray-700 aria-pressed:shadow-[inset_0_0_0_2px_currentColor]"
        type="button"
        disabled={pending}
        aria-pressed={task.outcome === "pending"}
        aria-label={`Mark ${task.title} pending`}
        onClick={() =>
          void sendCommand({
            type: "set-task-outcome",
            taskId: task.id,
            outcome: "pending",
          })
        }
      >
        ·
      </button>
      <button
        className="min-h-11 min-w-11 rounded-md border-0 bg-emerald-100 p-[0.35rem] text-[0.7rem] font-bold text-emerald-800 aria-pressed:shadow-[inset_0_0_0_2px_currentColor]"
        type="button"
        disabled={pending}
        aria-pressed={task.outcome === "success"}
        aria-label={`Mark ${task.title} successful`}
        onClick={() =>
          void sendCommand({
            type: "set-task-outcome",
            taskId: task.id,
            outcome: "success",
          })
        }
      >
        ✓
      </button>
      <button
        className="min-h-11 min-w-11 rounded-md border-0 bg-red-100 p-[0.35rem] text-[0.7rem] font-bold text-red-800 aria-pressed:shadow-[inset_0_0_0_2px_currentColor]"
        type="button"
        disabled={pending}
        aria-pressed={task.outcome === "failure"}
        aria-label={`Mark ${task.title} failed`}
        onClick={() =>
          void sendCommand({
            type: "set-task-outcome",
            taskId: task.id,
            outcome: "failure",
          })
        }
      >
        ×
      </button>
    </span>
  );
}

function MissionSidebar({
  projection,
  pending,
  sendCommand,
  onForget,
}: {
  projection: ActorProjection;
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
  onForget: () => void;
}) {
  const phaseCallout = phaseCallouts[projection.phase];
  const completedTaskCount = projection.tasks.filter(
    (task) => task.outcome === "success",
  ).length;
  const taskCount = projection.tasks.length;
  const isTaskSelectionPhase =
    projection.phase === "assigning-tasks" ||
    projection.phase === "ready-to-start-trick";

  return (
    <aside
      className="relative flex min-h-0 min-w-0 flex-col justify-between gap-6 overflow-y-auto rounded-lg bg-white px-4 pb-4 max-[700px]:order-first max-[700px]:flex-none max-[700px]:overflow-auto max-[700px]:rounded-t-none max-[700px]:rounded-b-lg"
      aria-label="Mission information"
    >
      <div className="flex flex-col gap-4">
        <div
          className="sticky top-0 z-20 flex min-h-9 items-center justify-start bg-white pr-9 pt-4"
          data-slot="mission-sidebar-header"
        >
          <Link
            className="shrink-0 text-crew-ink no-underline"
            href="/"
            aria-label="Crew home"
          >
            <CrewLogo size="small" />
          </Link>

          <details className="group absolute top-4 right-0 z-10 shrink-0">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md text-base leading-none text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 [&::-webkit-details-marker]:hidden">
              <EllipsisVertical className="size-4" aria-hidden="true" />
              <span className="sr-only">Room options</span>
            </summary>
            <div
              className="absolute top-full right-0 mt-1 w-40 rounded-md border border-gray-200 bg-white p-1 shadow-lg"
              role="menu"
            >
              <button
                className="flex min-h-9 w-full items-center gap-2 rounded-sm border-0 bg-transparent px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                type="button"
                role="menuitem"
                onClick={onForget}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </details>
        </div>

        <section
          className="rounded-lg border border-indigo-100 bg-indigo-50/55 p-3 text-left"
          data-slot="mission-phase-callout"
        >
          <div aria-atomic="true" aria-live="polite" role="status">
            <p className="m-0 text-sm leading-snug font-semibold text-gray-600">
              <span
                className="text-crew-ink"
                data-slot="mission-phase-name"
              >
                {phaseCallout.name}
              </span>{" "}
              <span
                className="font-normal"
                data-slot="mission-phase-instructions"
              >
                {phaseCallout.instructions}
              </span>
            </p>
            {taskCount && !isTaskSelectionPhase ? (
              <div
                className="mt-2 flex items-center gap-2"
                data-slot="mission-task-progress"
              >
                <Progress
                  aria-label="Task progress"
                  className="h-1.5 min-w-0 flex-1 bg-indigo-100 *:data-[slot=progress-indicator]:bg-indigo-600"
                  getValueLabel={(value, max) =>
                    `Successful tasks: ${value} of ${max}`
                  }
                  max={taskCount}
                  value={completedTaskCount}
                />
                <span
                  className="shrink-0 text-[0.65rem] font-medium text-indigo-900"
                  aria-hidden="true"
                >
                  {completedTaskCount}/{taskCount}
                </span>
              </div>
            ) : null}
          </div>
          {projection.phase === "preflight" ? (
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              type="button"
              disabled={!projection.legalActions.canStartMission || pending}
              onClick={() => void sendCommand({ type: "start-mission" })}
            >
              <Play aria-hidden="true" />
              Start Mission
            </Button>
          ) : null}
          {projection.phase === "assigning-tasks" ||
          projection.phase === "ready-to-start-trick" ? (
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              type="button"
              disabled={!projection.legalActions.canStartTrick || pending}
              onClick={() => void sendCommand({ type: "start-trick" })}
            >
              <Play aria-hidden="true" />
              Start Trick
            </Button>
          ) : null}
          {projection.phase === "between-tricks" &&
          projection.legalActions.canStartTrick ? (
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              type="button"
              disabled={pending}
              onClick={() => void sendCommand({ type: "begin-trick" })}
            >
              <Play aria-hidden="true" />
              Start Trick
            </Button>
          ) : null}
        </section>

        {projection.mission.deadSpot ? (
          <span className="text-center text-[0.7rem] text-gray-600 max-[700px]:overflow-hidden max-[700px]:text-ellipsis max-[700px]:whitespace-nowrap">
            No communication
          </span>
        ) : null}
      </div>

      <div className="mt-auto grid w-full shrink-0 justify-items-center gap-4">
        <div className="grid justify-items-center gap-[0.45rem] empty:hidden max-[700px]:flex max-[700px]:flex-wrap max-[700px]:items-center max-[700px]:justify-center">
          {projection.legalActions.canSetMissionOutcome ? (
            <MissionOutcomeActions pending={pending} sendCommand={sendCommand} />
          ) : projection.phase === "adjudicating" ? (
            <p className="m-0 text-center text-[0.72rem] text-gray-600">
              Mark every remaining task.
            </p>
          ) : null}
        </div>

        <div
          className="grid w-full shrink-0 gap-2 text-center"
          data-slot="mission-sidebar-metadata"
        >
          <div className="grid w-full grid-cols-2 gap-4">
            <Counter label="Mission" value={projection.mission.number} />
            <Counter label="Attempt" value={projection.mission.attemptNumber} />
          </div>
          <p className="m-0 text-sm text-gray-600 min-[701px]:[@media(max-height:720px)]:text-[0.68rem] min-[701px]:[@media(max-height:720px)]:leading-tight">
            <CrewEdition editionKey={projection.mission.editionKey} />
          </p>
        </div>
      </div>
    </aside>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <span className="grid justify-items-center">
      <small className="text-[0.7rem] tracking-wider text-gray-600 uppercase max-[700px]:text-[0.55rem] min-[701px]:[@media(max-height:720px)]:text-[0.6rem] min-[701px]:[@media(max-height:720px)]:leading-tight">
        {label}
      </small>
      <strong className="font-(--font-display) text-[0.9rem] max-[700px]:text-xs min-[701px]:[@media(max-height:720px)]:text-[0.78rem] min-[701px]:[@media(max-height:720px)]:leading-tight">
        {value}
      </strong>
    </span>
  );
}

function MissionOutcomeActions({
  pending,
  sendCommand,
}: {
  pending: boolean;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  return (
    <section
      className="grid w-full gap-[0.4rem] max-[700px]:flex max-[700px]:flex-wrap max-[700px]:items-center max-[700px]:justify-center"
      aria-labelledby="mission-outcome-title"
    >
      <h2
        className="m-0 text-center text-[0.78rem] max-[700px]:w-full"
        id="mission-outcome-title"
      >
        How did the mission go?
      </h2>
      <p className="mx-0 mt-0 mb-1 text-center text-[0.65rem] text-gray-600 max-[700px]:hidden">
        Check the printed rule, then record the result.
      </p>
      <Button
        size="sm"
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Mark this mission complete?")) {
            void sendCommand({ type: "set-mission-outcome", outcome: "success" });
          }
        }}
      >
        Mission complete
      </Button>
      <Button
        variant="secondary"
        size="sm"
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Mark this attempt unsuccessful?")) {
            void sendCommand({ type: "set-mission-outcome", outcome: "failure" });
          }
        }}
      >
        Mission failed
      </Button>
    </section>
  );
}

function CrewPanels({
  projection,
  layout,
  pending,
  draggedCard,
  sendCommand,
}: {
  projection: ActorProjection;
  layout: "compact" | "main" | "strip";
  pending: boolean;
  draggedCard: Card | null;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
}) {
  const visibleTrick = projection.currentTrick ?? projection.lastTrick;

  return (
    <section
      className={cn(
        "grid min-h-0 grid-cols-[repeat(var(--crew-count,5),minmax(0,1fr))] overflow-hidden motion-reduce:scroll-auto max-[700px]:h-auto max-[700px]:w-auto max-[700px]:min-h-0 max-[700px]:flex-1 max-[700px]:auto-cols-[minmax(15rem,82vw)] max-[700px]:grid-flow-col max-[700px]:grid-cols-none max-[700px]:snap-x max-[700px]:snap-mandatory max-[700px]:overflow-x-auto max-[700px]:overflow-y-hidden",
        layout === "main"
          ? "h-full min-w-0"
          : layout === "compact"
            ? "h-40 flex-none basis-40 min-[701px]:[@media(max-height:720px)]:h-36 min-[701px]:[@media(max-height:720px)]:basis-36 max-[700px]:mx-2 max-[700px]:h-40 max-[700px]:flex-none max-[700px]:basis-40"
            : "h-60 flex-none basis-60 min-[701px]:[@media(max-height:720px)]:h-52 min-[701px]:[@media(max-height:720px)]:basis-52 max-[700px]:mx-2",
      )}
      style={{ "--crew-count": projection.players.length } as CSSProperties}
      aria-label="Crew"
      data-crew-layout={layout}
    >
      {projection.players.map((player) => {
        const played = visibleTrick?.plays.find(
          (play) => play.playerId === player.id,
        );
        const communicationCard = projectedCard(player.communication?.cardId);
        const tasks = projection.tasks.filter((task) => task.ownerPlayerId === player.id);
        const isSelf = player.id === projection.self.id;
        const currentTurnPlaceholder =
          projection.phase !== "assigning-tasks" && player.isCurrent
            ? "Turn"
            : "—";
        const canDropToPlay = Boolean(
          draggedCard &&
            !pending &&
            projection.legalActions.playableCardIds.includes(draggedCard.id),
        );
        const canDropToCommunication = Boolean(
          draggedCard &&
            !pending &&
            projection.legalActions.communicationOptions.some(
              (option) => option.cardId === draggedCard.id,
            ),
        );

        return (
          <article
            className={cn(
              "min-h-0 min-w-0 border-l-2 border-solid border-l-gray-200 px-4 pt-1 pb-2 first:border-l-0 min-[701px]:max-[1100px]:px-2 max-[700px]:snap-center max-[700px]:overflow-y-auto",
              layout === "main" ? "overflow-y-auto" : "overflow-hidden",
            )}
            key={player.id}
            aria-label={`${player.displayName} station`}
          >
            <header className="flex min-h-12 items-center justify-center gap-[0.45rem] min-[701px]:[@media(max-height:720px)]:min-h-10">
              <span
                className={cn(
                  "inline-flex h-10 max-w-40 items-center overflow-hidden px-3 py-2 text-[0.78rem] text-ellipsis whitespace-nowrap",
                  player.id === projection.self.id &&
                    "rounded-full bg-white font-bold ring-2 ring-inset ring-gray-400",
                )}
              >
                {player.displayName}
              </span>
              <span className="inline-flex h-10 items-center gap-0 rounded-full bg-white px-[0.45rem] py-1 [&>span]:grid [&>span]:size-[1.7rem] [&>span]:place-items-center [&>span]:text-sm">
                {player.isCaptain ? <span title="Commander">👑</span> : null}
                <span title={`${player.tricksWon} tricks won`}>
                  {numberEmoji(player.tricksWon)}
                </span>
              </span>
            </header>

            <div className="flex min-h-[5.7rem] items-start justify-center gap-[clamp(0.45rem,2vw,1.25rem)] pt-[0.35rem] min-[701px]:max-[1100px]:gap-[0.35rem] min-[701px]:[@media(max-height:720px)]:min-h-[4.9rem] min-[701px]:[@media(max-height:720px)]:pt-[0.1rem]">
              {isSelf ? (
                <DroppableCardStation
                  card={projectedCard(played?.cardId)}
                  dragLabel="Play card"
                  dragging={Boolean(draggedCard)}
                  dropId={playDropId}
                  enabled={canDropToPlay}
                  label="Played"
                  placeholder={currentTurnPlaceholder}
                  target="play"
                />
              ) : (
                <CardStation
                  label="Played"
                  card={projectedCard(played?.cardId)}
                  placeholder={currentTurnPlaceholder}
                />
              )}
              {isSelf ? (
                <DroppableCardStation
                  card={communicationCard}
                  dragLabel="Communicate"
                  dragging={Boolean(draggedCard)}
                  dropId={communicationDropId}
                  enabled={canDropToCommunication}
                  label="Communication"
                  placeholder="—"
                  qualifier={player.communication?.qualifier}
                  target="communicate"
                  transformScale={0.8}
                />
              ) : (
                <CardStation
                  label="Communication"
                  card={communicationCard}
                  placeholder="—"
                  qualifier={player.communication?.qualifier}
                  transformScale={0.8}
                />
              )}
            </div>

            {tasks.length && layout !== "compact" ? (
              <div
                className="flex min-h-[4.8rem] items-center gap-[0.15rem] overflow-x-auto py-1"
                aria-label={`${player.displayName}'s tasks`}
              >
                {tasks.map((task) => {
                  const canResolve =
                    layout === "main" &&
                    projection.legalActions.taskOutcomeTaskIds.includes(task.id);
                  const releasable =
                    projection.legalActions.releasableTaskIds.includes(task.id);
                  const tile = (
                    <TaskTile
                      task={task}
                      card={projectedCard(task.cardId)}
                      ownerName={player.displayName}
                      action={
                        canResolve ? (
                          <TaskOutcomeActions
                            task={task}
                            pending={pending}
                            sendCommand={sendCommand}
                          />
                        ) : undefined
                      }
                    />
                  );

                  return releasable ? (
                    <TaskSelectionButton
                      action="release"
                      key={task.id}
                      pending={pending}
                      sendCommand={sendCommand}
                      task={task}
                    >
                      {tile}
                    </TaskSelectionButton>
                  ) : (
                    <span key={task.id}>{tile}</span>
                  );
                })}
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

type CardStationProps = {
  card: Card | null;
  containerRef?: (node: HTMLElement | null) => void;
  dragLabel?: string;
  dragging?: boolean;
  dropActive?: boolean;
  dropEnabled?: boolean;
  label: string;
  placeholder: string;
  qualifier?: CommunicationQualifier;
  target?: "play" | "communicate";
  transformScale?: number;
};

function DroppableCardStation({
  dropId,
  enabled,
  ...props
}: CardStationProps & { dropId: string; enabled: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    disabled: !enabled,
  });

  return (
    <CardStation
      {...props}
      containerRef={setNodeRef}
      dropActive={isOver}
      dropEnabled={enabled}
    />
  );
}

function CardStation({
  label,
  card,
  placeholder,
  qualifier,
  transformScale,
  containerRef,
  dragLabel,
  dragging = false,
  dropActive = false,
  dropEnabled = false,
  target,
}: CardStationProps) {
  const dropState = dragging
    ? dropEnabled
      ? dropActive
        ? "active"
        : "available"
      : "unavailable"
    : "idle";

  return (
    <span
      className={cn(
        "relative grid min-w-13 justify-items-center gap-[0.2rem] rounded-xl transition-[background-color,box-shadow] motion-reduce:transition-none",
        dropState === "available" &&
          "bg-indigo-50/80 ring-2 ring-indigo-300 ring-offset-2",
        dropState === "active" &&
          "bg-indigo-100 ring-4 ring-indigo-600 ring-offset-2",
      )}
      data-card-drop-target={target}
      data-drop-state={dropState}
      ref={containerRef}
    >
      <small className="sr-only">{label}</small>
      {card ? (
        <span className="relative inline-flex">
          <GameCard card={card} transformScale={transformScale} />
          {qualifier ? (
            <span className="absolute bottom-[-0.55rem] left-1/2 -translate-x-1/2 rounded-full bg-white px-[0.35rem] py-[0.15rem] text-[0.52rem] font-bold text-indigo-700">
              {qualifierCopy[qualifier]}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="grid h-[4.55rem] w-13 place-items-center rounded-lg border-2 border-dashed border-gray-300 text-[0.65rem] text-gray-600">
          {placeholder}
        </span>
      )}
      {dragging && dropEnabled ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl border-2 border-dashed border-indigo-500 bg-white/90 px-1 text-center text-[0.62rem] leading-tight font-bold text-indigo-700 uppercase backdrop-blur-sm",
            dropActive && "border-solid bg-indigo-100/95 text-indigo-900",
          )}
          aria-hidden="true"
        >
          {dragLabel}
        </span>
      ) : null}
    </span>
  );
}

function RoomDock({
  projection,
  hand,
  pending,
  communicationMode,
  communicatingCardId,
  sendCommand,
  onCommunicationChange,
}: {
  projection: ActorProjection;
  hand: Card[];
  pending: boolean;
  communicationMode: boolean;
  communicatingCardId: CardId | null;
  sendCommand: (command: PlayerCommand) => Promise<boolean>;
  onCommunicationChange: (mode: boolean, cardId: CardId | null) => void;
}) {
  const dockRef = useRef<HTMLElement>(null);
  const firstQualifierRef = useRef<HTMLButtonElement>(null);
  const selectedCardRef = useRef<HTMLButtonElement>(null);
  const canCommunicate =
    projection.legalActions.communicationOptions.length > 0;
  const isCommunicationMode = communicationMode && canCommunicate;
  const communicatingCard = hand.find(
    (card) => card.id === communicatingCardId,
  );
  const communicationOption = projection.legalActions.communicationOptions.find(
    (option) => option.cardId === communicatingCardId,
  );

  useEffect(() => {
    if (communicatingCardId) firstQualifierRef.current?.focus();
  }, [communicatingCardId]);

  function closeCommunicationPicker() {
    selectedCardRef.current?.focus();
    onCommunicationChange(isCommunicationMode, null);
  }

  return (
    <RoomDockImpl
      ref={dockRef}
      aria-label="Your hand"
    >
      {canCommunicate ? (
        <Button
          className="absolute top-[0.2rem] right-4"
          size="sm"
          type="button"
          disabled={pending}
          aria-pressed={isCommunicationMode}
          aria-label={
            isCommunicationMode
              ? "Cancel communication mode"
              : "Communicate a card"
          }
          onClick={() => {
            onCommunicationChange(!isCommunicationMode, null);
          }}
        >
          {isCommunicationMode ? "Cancel" : "Communicate"}
        </Button>
      ) : null}

      <div
        className="flex min-w-0 flex-1 overflow-x-auto overscroll-x-contain motion-reduce:scroll-auto"
        data-slot="hand-scroll-area"
      >
        <div
          className="m-auto flex w-max flex-none items-center justify-center gap-2 px-2"
          data-slot="hand-card-row"
        >
          {hand.length ? (
            hand.map((card) => {
              const playable =
                projection.legalActions.playableCardIds.includes(card.id);
              const communicable =
                projection.legalActions.communicationOptions.some(
                  (option) => option.cardId === card.id,
                );
              const interactive = isCommunicationMode
                ? communicable
                : playable;

              return (
                <DraggableHandCard
                  card={card}
                  disabled={pending}
                  key={card.id}
                  selected={communicatingCardId === card.id}
                  buttonRef={
                    communicatingCardId === card.id
                      ? selectedCardRef
                      : undefined
                  }
                  labelPrefix={
                    isCommunicationMode
                      ? communicable
                        ? "Communicate"
                        : "Unavailable"
                      : playable
                        ? "Play"
                        : "Unavailable"
                  }
                  onClick={
                    interactive
                      ? isCommunicationMode
                        ? () => onCommunicationChange(true, card.id)
                        : () =>
                            void sendCommand({
                              type: "play-card",
                              cardId: card.id,
                            })
                      : undefined
                  }
                />
              );
            })
          ) : projection.phase !== "preflight" ? (
            <p className="m-0 self-center text-xs text-gray-600">
              No cards remain in your hand.
            </p>
          ) : null}
        </div>
      </div>

      {communicatingCard && communicationOption ? (
        <div
          className="absolute right-4 bottom-[calc(100%+0.5rem)] left-4 z-20 flex min-h-[3.6rem] items-center justify-center gap-[0.35rem] rounded-lg border-2 border-solid border-gray-200 bg-gray-100 p-[0.4rem] max-[520px]:justify-start max-[520px]:overflow-x-auto"
          role="group"
          aria-label="Choose communication"
        >
          <GameCard card={communicatingCard} transformScale={0.8} />
          <span className="text-[0.7rem] text-gray-600 max-[520px]:hidden">
            Communicate as
          </span>
          {communicationOption.qualifiers.map((qualifier, index) => (
            <Button
              className="flex-none"
              size="sm"
              ref={index === 0 ? firstQualifierRef : undefined}
              type="button"
              key={qualifier}
              disabled={pending}
              onClick={() => {
                void sendCommand({
                  type: "communicate",
                  cardId: communicatingCard.id,
                  qualifier,
                }).then((sent) => {
                  if (sent) {
                    onCommunicationChange(false, null);
                    requestAnimationFrame(() => dockRef.current?.focus());
                  }
                });
              }}
            >
              {qualifierCopy[qualifier]}
            </Button>
          ))}
          <Button
            className="flex-none"
            variant="secondary"
            size="sm"
            type="button"
            onClick={closeCommunicationPicker}
          >
            Cancel
          </Button>
        </div>
      ) : null}
    </RoomDockImpl>
  );
}

function DraggableHandCard({
  card,
  disabled,
  selected,
  buttonRef,
  labelPrefix,
  onClick,
}: {
  card: Card;
  disabled: boolean;
  selected: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  labelPrefix: string;
  onClick?: () => void;
}) {
  const { isDragging, listeners, setNodeRef } = useDraggable({
    id: card.id,
    disabled,
    data: { type: "hand-card" },
  });

  return (
    <div
      className={cn(
        "group relative grid flex-none justify-items-center gap-[0.2rem]",
        isDragging && "z-10 opacity-30",
      )}
      data-card-id={card.id}
      data-dragging={isDragging ? "true" : "false"}
      ref={setNodeRef}
    >
      <div
        {...listeners}
        className={cn(
          "cursor-grab touch-pan-x active:cursor-grabbing",
          disabled && "cursor-not-allowed",
        )}
      >
        <GameCard
          card={card}
          disabled={disabled}
          selected={selected}
          buttonRef={buttonRef}
          labelPrefix={labelPrefix}
          onClick={onClick}
        />
      </div>
    </div>
  );
}

function cardName(card: Card) {
  const suit =
    card.suit === "trump"
      ? "Trump"
      : `${card.suit.charAt(0).toUpperCase()}${card.suit.slice(1)}`;
  return `${suit} ${card.value}`;
}

function numberEmoji(value: number) {
  const numerals = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
  return numerals[value] ?? String(value);
}

function phaseViewScope(phase: ActorProjection["phase"]) {
  if (phase === "assigning-tasks" || phase === "ready-to-start-trick") {
    return "tasks";
  }
  if (phase === "between-tricks" || phase === "playing-trick") return "gameplay";
  return phase;
}
