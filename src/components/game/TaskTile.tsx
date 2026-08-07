import type { ReactNode } from "react";

import { getCard } from "@/game/config/cards";
import {
  findDeepSeaTask,
  type DeepSeaTaskVisual,
  type DeepSeaTaskVisualItem,
} from "@/game/config/deep-sea-tasks";
import { cn } from "@/lib/utils";

import {
  CARD_SUIT_COLOR_CLASS_NAME,
  CARD_SUIT_META,
} from "./card-suit-meta";
import { TaskBoot } from "./TaskBoot";
import type { Card, ProjectedTask, TaskOutcome } from "./types";

const ANY_COLOR_BACKGROUND_IMAGE =
  "conic-gradient(var(--color-red-400), var(--color-amber-400), var(--color-emerald-500), var(--color-sky-500), var(--color-red-400))";

const statusLabel: Record<TaskOutcome, string> = {
  pending: "Pending",
  success: "Successful",
  failure: "Failed",
};

export type TaskTileProps = {
  task: ProjectedTask;
  card?: Card | null;
  ownerName?: string | null;
  action?: ReactNode;
  emphasized?: boolean;
  showInfo?: boolean;
  showBoot?: boolean;
  className?: string;
};

export function TaskTile({
  task,
  card,
  ownerName,
  action,
  emphasized = false,
  showInfo = false,
  showBoot = true,
  className,
}: TaskTileProps) {
  const resolvedCard =
    card === undefined && task.cardId ? getCard(task.cardId) : (card ?? null);
  const deepSeaDefinition = resolvedCard
    ? null
    : findDeepSeaTask(task.definitionId);
  const visual = deepSeaDefinition?.presentation.visual ?? null;
  const order = resolvedCard ? task.order : null;
  const difficulty = deepSeaDefinition ? task.difficulty : null;
  const resolvedOwner =
    ownerName === undefined ? task.ownerDisplayName : ownerName;
  const description = [
    task.title,
    resolvedOwner ? `Assigned to ${resolvedOwner}.` : "Unassigned.",
    `${statusLabel[task.outcome]}.`,
    order ? `Order ${order}.` : null,
    difficulty === null ? null : `Difficulty ${difficulty}.`,
    task.footnote,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cn(
        "relative isolate inline-grid w-max justify-items-center gap-0 p-[0.45rem]",
        className,
      )}
      data-task-outcome={task.outcome}
    >
      <div
        className={cn(
          "relative z-1 grid place-items-center text-task-ink",
          emphasized ? "size-21" : "size-14",
        )}
        data-slot="task-tile"
        role="img"
        aria-label={description}
        title={task.title}
      >
        <span
          className={cn(
            "relative flex size-14 items-center justify-center rounded-md bg-white select-none",
            emphasized && (resolvedCard ? "size-21" : "scale-150"),
          )}
          data-slot="task-face"
        >
          {resolvedCard ? (
            <CardPill card={resolvedCard} emphasized={emphasized} />
          ) : (
            <DeepSeaTaskFace
              visual={visual ?? { kind: "text", text: task.title }}
            />
          )}
        </span>
      </div>

      {showBoot ? (
        <TaskBoot
          card={resolvedCard}
          emphasized={emphasized}
          showInfo={showInfo}
          task={task}
        />
      ) : null}

      {action ? (
        <div className="mt-[0.35rem] flex min-h-11 items-center justify-center gap-1 [&_a]:min-h-11 [&_a]:min-w-11 [&_a:focus-visible]:outline-[3px] [&_a:focus-visible]:outline-solid [&_a:focus-visible]:outline-task-focus [&_a:focus-visible]:outline-offset-2 [&_button]:min-h-11 [&_button]:min-w-11 [&_button:focus-visible]:outline-[3px] [&_button:focus-visible]:outline-solid [&_button:focus-visible]:outline-task-focus [&_button:focus-visible]:outline-offset-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}

function CardPill({
  card,
  emphasized,
}: {
  card: Card;
  emphasized: boolean;
}) {
  const { Icon, label: suitLabel } = CARD_SUIT_META[card.suit];

  return (
    <span
      className={cn(
        "flex overflow-hidden rounded-[0.35rem] border border-task-border bg-white forced-colors:border-[CanvasText]",
        emphasized ? "h-[2.1rem] w-[3.6rem]" : "h-[1.65rem] w-[2.8rem]",
        CARD_SUIT_COLOR_CLASS_NAME[card.suit],
      )}
      data-card-suit={card.suit}
      data-slot="task-card"
      aria-hidden="true"
    >
      <span className="flex w-1/2 items-center justify-center">
        <span
          className={cn(
            "font-display font-extrabold leading-none tabular-nums",
            emphasized ? "text-base" : "text-[0.8rem]",
          )}
          data-slot="task-card-value"
        >
          {card.value}
        </span>
      </span>
      <span
        className={cn(
          "flex w-1/2 rounded-r-[0.3rem] bg-current",
          emphasized ? "text-[0.95rem]" : "text-xs",
        )}
        data-slot="task-card-field"
        title={suitLabel}
      >
        <Icon
          className="m-auto text-white opacity-20"
          aria-hidden="true"
          data-slot="task-card-symbol"
          size="1em"
          strokeWidth={2}
        />
      </span>
    </span>
  );
}

function DeepSeaTaskFace({ visual }: { visual: DeepSeaTaskVisual }) {
  if (visual.kind === "text") {
    return (
      <span
        className="flex h-full w-full flex-col justify-center px-0.5"
        data-slot="deep-sea-task-text"
        aria-hidden="true"
      >
        <span className="whitespace-pre-line text-center text-[0.5rem] leading-tight">
          {visual.text}
        </span>
      </span>
    );
  }

  if (visual.kind === "header") {
    return (
      <span
        className="flex h-full w-full flex-col items-center justify-center gap-1 py-1"
        data-slot="deep-sea-task-header"
        aria-hidden="true"
      >
        <span className="mx-auto flex-none text-[0.5rem] leading-tight">
          {visual.header}
        </span>
        <span className="flex flex-none justify-center">
          <span className="flex flex-wrap justify-center gap-x-1">
            {visual.items.map((item, index) =>
              item.text ? (
                <span
                  className="my-auto -mx-0.5 text-[0.5rem] leading-tight"
                  key={index}
                >
                  {item.text}
                </span>
              ) : (
                <TaskMiniPill item={item} key={index} />
              ),
            )}
          </span>
        </span>
      </span>
    );
  }

  const rows = visual.cards.length < 3
    ? [visual.cards]
    : visual.cards.length === 3
      ? [visual.cards.slice(0, 1), visual.cards.slice(1)]
      : [visual.cards.slice(0, 2), visual.cards.slice(2, 4)];

  return (
    <span
      className="flex h-full w-full flex-col justify-center gap-1 p-1"
      data-slot="deep-sea-task-cards"
      aria-hidden="true"
    >
      {rows.map((row, rowIndex) => (
        <span className="flex w-full justify-center gap-1" key={rowIndex}>
          {row.map((item, itemIndex) => (
            <TaskMiniPill item={item} key={itemIndex} />
          ))}
        </span>
      ))}
    </span>
  );
}

function TaskMiniPill({ item }: { item: DeepSeaTaskVisualItem }) {
  return (
    <span
      className={cn(
        "grid size-5 place-items-center rounded-full bg-cover font-display leading-none",
        item.suit
          ? [CARD_SUIT_COLOR_CLASS_NAME[item.suit], "bg-current"]
          : "text-white",
      )}
      style={
        item.suit
          ? undefined
          : { backgroundImage: ANY_COLOR_BACKGROUND_IMAGE }
      }
      data-card-suit={item.suit ?? "wild"}
      data-slot="deep-sea-task-mini-card"
      aria-hidden="true"
    >
      <span className={cn(item.suit && "text-white")}>
        {item.value}
      </span>
    </span>
  );
}
