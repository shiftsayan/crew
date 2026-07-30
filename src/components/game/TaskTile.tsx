import type { ReactNode } from "react";

import { getCard } from "@/game/config/cards";

import styles from "./TaskTile.module.css";
import type { Card, ProjectedTask, TaskOutcome } from "./types";

const suitMeta: Record<
  Card["suit"],
  { label: string; symbol: string }
> = {
  pink: { label: "Pink", symbol: "■" },
  blue: { label: "Blue", symbol: "●" },
  green: { label: "Green", symbol: "▲" },
  yellow: { label: "Yellow", symbol: "×" },
  trump: { label: "Trump", symbol: "⌃" },
};

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

const statusCopy: Record<
  TaskOutcome,
  { label: string; symbol: string }
> = {
  pending: { label: "Pending", symbol: "·" },
  success: { label: "Successful", symbol: "✓" },
  failure: { label: "Failed", symbol: "×" },
};

export type TaskTileProps = {
  task: ProjectedTask;
  card?: Card | null;
  ownerName?: string | null;
  action?: ReactNode;
  emphasized?: boolean;
  className?: string;
};

export function TaskTile({
  task,
  card,
  ownerName,
  action,
  emphasized = false,
  className,
}: TaskTileProps) {
  const resolvedCard =
    card === undefined && task.cardId ? getCard(task.cardId) : (card ?? null);
  const resolvedOwner =
    ownerName === undefined ? task.ownerDisplayName : ownerName;
  const status = statusCopy[task.outcome];
  const order = task.order ? orderCopy[task.order] : null;
  const description = [
    task.title,
    resolvedOwner ? `Assigned to ${resolvedOwner}.` : "Unassigned.",
    `${status.label}.`,
    task.order ? `Order ${task.order}.` : null,
    task.difficulty === null ? null : `Difficulty ${task.difficulty}.`,
    task.footnote,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-task-outcome={task.outcome}
    >
      <div
        className={[
          styles.tile,
          emphasized ? styles.emphasized : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="img"
        aria-label={description}
        title={description}
      >
        <span
          className={[styles.status, styles[task.outcome]].join(" ")}
          aria-hidden="true"
        >
          {status.symbol}
        </span>

        {resolvedCard ? (
          <CardPill card={resolvedCard} />
        ) : (
          <span className={styles.manualText} aria-hidden="true">
            {task.title}
          </span>
        )}

        {task.difficulty !== null && !resolvedCard ? (
          <span className={styles.difficulty} aria-hidden="true">
            {task.difficulty}
          </span>
        ) : null}

        {order ? (
          <span
            className={[
              styles.order,
              resolvedCard ? styles[`order-${resolvedCard.suit}`] : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            {order}
          </span>
        ) : null}
      </div>

      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

function CardPill({ card }: { card: Card }) {
  const suit = suitMeta[card.suit];

  return (
    <span className={styles.cardPill} aria-hidden="true">
      <span className={styles.cardRank}>{card.value}</span>
      <span
        className={[styles.cardSuit, styles[card.suit]].join(" ")}
        title={suit.label}
      >
        {suit.symbol}
      </span>
    </span>
  );
}
