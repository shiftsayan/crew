import type { Card } from "./types";
import styles from "./GameCard.module.css";

const suitMeta: Record<
  Card["suit"],
  { label: string; symbol: string }
> = {
  pink: { label: "Pink", symbol: "■" },
  blue: { label: "Blue", symbol: "●" },
  green: { label: "Green", symbol: "▲" },
  yellow: { label: "Yellow", symbol: "×" },
  trump: { label: "Trump", symbol: "⇈" },
};

type GameCardProps = {
  card: Card;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  labelPrefix?: string;
};

export function GameCard({
  card,
  disabled = false,
  selected = false,
  compact = false,
  onClick,
  labelPrefix,
}: GameCardProps) {
  const meta = suitMeta[card.suit] ?? { label: card.suit, symbol: "●" };
  const className = [
    styles.card,
    styles[card.suit],
    compact ? styles.compact : "",
    selected ? styles.selected : "",
    // Stable hooks allow the room layout to size cards without owning their visual treatment.
    "game-card",
    `game-card--${card.suit}`,
    compact ? "game-card--compact" : "",
    selected ? "game-card--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const label = `${labelPrefix ? `${labelPrefix}: ` : ""}${meta.label} ${card.value}`;

  if (onClick) {
    return (
      <button
        className={className}
        type="button"
        disabled={disabled}
        aria-pressed={selected || undefined}
        aria-label={label}
        onClick={onClick}
      >
        <span className={styles.rank}>{card.value}</span>
        <span className={styles.symbol} aria-hidden="true">
          {meta.symbol}
        </span>
      </button>
    );
  }

  return (
    <span className={className} role="img" aria-label={label}>
      <span className={styles.rank}>{card.value}</span>
      <span className={styles.symbol} aria-hidden="true">
        {meta.symbol}
      </span>
    </span>
  );
}
