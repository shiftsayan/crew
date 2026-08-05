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

const statusIconClassName: Record<TaskOutcome, string> = {
  pending: "text-blue-400",
  success: "text-green-500",
  failure: "text-red-600",
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
      className="flex h-5 w-14 items-center justify-between rounded-b-md bg-slate-200 px-1 text-task-ink"
      data-slot="task-boot"
    >
      <span
        className={cn(
          "grid size-3.5 shrink-0 place-items-center rounded-full bg-white",
          statusIconClassName[task.outcome],
        )}
        data-slot="task-status"
        aria-hidden="true"
      >
        <TaskStatusIcon outcome={task.outcome} />
      </span>

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
          className="inline-flex size-3.5 shrink-0 items-center justify-center gap-px rounded-full bg-white text-[0.45rem] leading-none"
          data-slot="deep-sea-task-difficulty"
          aria-label={`Difficulty ${task.difficulty}`}
        >
          <Gauge className="size-2" aria-hidden="true" />
          <span aria-hidden="true">{task.difficulty}</span>
        </span>
      ) : null}

      {showInfo && deepSeaDefinition ? (
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="relative grid size-3.5 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-white p-0 text-task-ink transition-colors before:absolute before:-inset-1 before:rounded-full hover:bg-slate-100 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-700"
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
