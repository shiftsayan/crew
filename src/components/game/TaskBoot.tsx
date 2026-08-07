import { Check, Gauge, Radio, X } from "lucide-react";

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
  pending: "bg-white text-black",
  success: "bg-green-500 text-white",
  failure: "bg-red-600 text-white",
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
  const order = resolvedCard && task.order ? orderCopy[task.order] : null;

  const boot = (
    <div
      className="grid h-5 w-14 grid-cols-2 items-center rounded-b-md bg-slate-200 px-1 text-task-ink"
      data-slot="task-boot"
    >
      {order ? (
        <span
          className="col-start-1 row-start-1 inline-flex size-3.5 shrink-0 items-center justify-center justify-self-start rounded-full bg-white text-[0.55rem] leading-none text-task-ink"
          data-slot="task-order"
          aria-hidden="true"
        >
          {order}
        </span>
      ) : null}

      {showInfo && deepSeaDefinition && task.difficulty !== null ? (
        <Dialog>
          <DialogTrigger asChild>
            <button
              className="group relative col-start-1 row-start-1 inline-flex h-3.5 shrink-0 cursor-pointer items-center justify-center justify-self-start gap-px rounded-full border-0 bg-white px-0.5 py-0 text-[0.55rem] leading-none text-task-ink before:absolute before:-inset-1 before:rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-700"
              data-slot="deep-sea-task-difficulty"
              type="button"
              aria-label={`Difficulty ${task.difficulty}. View details for ${task.title}`}
            >
              <Gauge
                className="size-2.5 transition-colors group-hover:text-slate-600"
                aria-hidden="true"
              />
              <span aria-hidden="true">{task.difficulty}</span>
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
      ) : deepSeaDefinition && task.difficulty !== null ? (
        <span
          className="col-start-1 row-start-1 inline-flex h-3.5 shrink-0 items-center justify-center justify-self-start gap-px rounded-full bg-white px-0.5 text-[0.55rem] leading-none"
          data-slot="deep-sea-task-difficulty"
          aria-label={`Difficulty ${task.difficulty}`}
        >
          <Gauge className="size-2.5" aria-hidden="true" />
          <span aria-hidden="true">{task.difficulty}</span>
        </span>
      ) : null}

      <span
        className={cn(
          "col-start-2 row-start-1 grid size-3.5 shrink-0 place-items-center justify-self-end rounded-full",
          statusClassName[task.outcome],
        )}
        data-slot="task-status"
        aria-hidden="true"
      >
        <TaskStatusIcon outcome={task.outcome} />
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        "relative before:absolute before:inset-x-0 before:-top-1 before:z-0 before:h-1 before:bg-slate-200 before:content-['']",
        emphasized ? "h-7.5 w-21" : "h-5 w-14",
        className,
      )}
      data-slot="task-boot-frame"
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
