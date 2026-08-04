import { BadgeInfo, Check, Gauge, Radio, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCard } from "@/game/config/cards";
import { findDeepSeaTask } from "@/game/config/deep-sea-tasks";
import { cn } from "@/lib/utils";

import type { Card, ProjectedTask, TaskOutcome } from "./types";

const orderCopy: Record<NonNullable<ProjectedTask["order"]>, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  first: "−",
  second: "=",
  third: "≡",
  last: "Ω",
  "last-trick": "Ω",
};

const statusClassName: Record<TaskOutcome, string> = {
  pending: "bg-blue-400",
  success: "bg-green-500",
  failure: "bg-red-600",
};

const orderSuitClassName: Record<Card["suit"], string> = {
  pink: "border-card-pink",
  blue: "border-card-blue",
  green: "border-card-green",
  yellow: "border-card-yellow",
  trump: "border-card-trump",
};

export type TaskBootProps = {
  task: ProjectedTask;
  card?: Card | null;
  emphasized?: boolean;
  showInfo?: boolean;
  className?: string;
};

export function TaskBoot({
  task,
  card,
  emphasized = false,
  showInfo = false,
  className,
}: TaskBootProps) {
  const resolvedCard =
    card === undefined && task.cardId ? getCard(task.cardId) : (card ?? null);
  const deepSeaDefinition = resolvedCard
    ? null
    : findDeepSeaTask(task.definitionId);
  const order =
    resolvedCard && task.order
      ? { copy: orderCopy[task.order], suit: resolvedCard.suit }
      : null;

  const boot = (
    <div
      className="flex h-5 w-14 items-center gap-px rounded-b-md bg-slate-300 px-px text-task-ink"
      data-slot="task-boot"
    >
      <span
        className={cn(
          "grid size-3 shrink-0 place-items-center rounded-full text-white",
          statusClassName[task.outcome],
        )}
        data-slot="task-status"
        aria-hidden="true"
      >
        <TaskStatusIcon outcome={task.outcome} />
      </span>

      <span className="ml-auto flex min-w-0 items-center gap-px">
        {order ? (
          <span
            className={cn(
              "inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border bg-white text-[0.55rem] leading-none text-task-ink forced-colors:border-[CanvasText]",
              orderSuitClassName[order.suit],
            )}
            data-slot="task-order"
            aria-hidden="true"
          >
            {order.copy}
          </span>
        ) : null}

        {deepSeaDefinition && task.difficulty !== null ? (
          <span
            className="flex items-center gap-px text-[0.65rem] leading-none"
            data-slot="deep-sea-task-difficulty"
            aria-label={`Difficulty ${task.difficulty}`}
          >
            <Gauge className="size-2.5" aria-hidden="true" />
            <span aria-hidden="true">{task.difficulty}</span>
          </span>
        ) : null}

        {showInfo && deepSeaDefinition ? (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-sm border-0 bg-transparent p-0 text-task-ink hover:bg-white/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-700"
                type="button"
                aria-label={`View details for ${task.title}`}
              >
                <BadgeInfo className="size-3" aria-hidden="true" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Task {deepSeaDefinition.number}</DialogTitle>
                <DialogDescription>{task.title}</DialogDescription>
              </DialogHeader>
              <p className="m-0 text-sm text-gray-600">
                Difficulty: 3P {deepSeaDefinition.difficulty[3]} · 4P{" "}
                {deepSeaDefinition.difficulty[4]} · 5P{" "}
                {deepSeaDefinition.difficulty[5]}
              </p>
              {task.footnote ? (
                <p className="m-0 text-sm italic text-gray-600">
                  {task.footnote}
                </p>
              ) : null}
            </DialogContent>
          </Dialog>
        ) : null}
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        emphasized ? "h-7.5 w-21" : "h-5 w-14",
        className,
      )}
    >
      <div className={emphasized ? "origin-top-left scale-150" : undefined}>
        {boot}
      </div>
    </div>
  );
}

function TaskStatusIcon({ outcome }: { outcome: TaskOutcome }) {
  if (outcome === "success") {
    return <Check className="size-2.5 stroke-3" />;
  }
  if (outcome === "failure") {
    return <X className="size-2.5 stroke-3" />;
  }
  return <Radio className="size-2.5" />;
}
