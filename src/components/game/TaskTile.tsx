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

const LEGACY_RAINBOW_BACKGROUND_IMAGE =
  'url("data:image/png;base64,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")';

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
        "inline-grid w-max justify-items-center gap-0 p-[0.45rem]",
        className,
      )}
      data-task-outcome={task.outcome}
    >
      <div
        className={cn(
          "relative grid place-items-center text-task-ink",
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
          : "text-black",
      )}
      style={
        item.suit
          ? undefined
          : { backgroundImage: LEGACY_RAINBOW_BACKGROUND_IMAGE }
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
