import type { CSSProperties, Ref } from "react";

import { cn } from "@/lib/utils";

import {
  CARD_SUIT_COLOR_CLASS_NAME,
  CARD_SUIT_META,
} from "./card-suit-meta";
import type { Card } from "./types";

type GameCardProps = {
  card: Card;
  disabled?: boolean;
  selected?: boolean;
  /** Visual-only CSS transform scale; the fixed card layout box is unchanged. */
  transformScale?: number;
  onClick?: () => void;
  labelPrefix?: string;
  buttonRef?: Ref<HTMLButtonElement>;
};

export function GameCard({
  card,
  disabled = false,
  selected = false,
  transformScale,
  onClick,
  labelPrefix,
  buttonRef,
}: GameCardProps) {
  const { Icon, label: suitLabel } =
    CARD_SUIT_META[card.suit] ?? CARD_SUIT_META.blue;
  const className = cn(
    "game-card relative block h-28 w-20 flex-none overflow-hidden rounded-xl border-0 bg-white p-1.5 select-none",
    CARD_SUIT_COLOR_CLASS_NAME[card.suit],
    onClick &&
      "min-h-0 cursor-pointer appearance-none transition-[translate,outline-color] duration-120 enabled:hover:z-2 enabled:hover:translate-y-[-0.2rem] focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-card-focus focus-visible:outline-offset-[3px] disabled:cursor-not-allowed disabled:filter-[grayscale(0.55)] disabled:opacity-[0.48] disabled:translate-y-0 motion-reduce:transition-none motion-reduce:enabled:hover:translate-y-0",
    selected &&
      "game-card--selected translate-y-[-0.2rem] outline-[3px] outline-solid outline-card-focus outline-offset-2 motion-reduce:translate-y-0",
    // Stable hooks allow the room layout to size cards without owning their visual treatment.
    `game-card--${card.suit}`,
  );
  const style: CSSProperties | undefined =
    transformScale === undefined
      ? undefined
      : { transform: `scale(${transformScale})` };
  const label = `${labelPrefix ? `${labelPrefix}: ` : ""}${suitLabel} ${card.value}`;

  const contents = (
    <>
      <span
        className="flex h-full w-full rounded-lg bg-current"
        data-slot="game-card-field"
      >
        <span
          className="m-auto text-4xl text-white opacity-20"
          data-slot="game-card-symbol"
          aria-hidden="true"
        >
          <Icon aria-hidden="true" size="1em" strokeWidth={2} />
        </span>
      </span>
      <span
        className="absolute top-0 left-0 z-2 flex h-8 w-8 rounded-tl-xl rounded-br-xl bg-white"
        data-slot="game-card-rank"
      >
        <span
          className="m-auto h-6 w-2 font-display text-lg font-bold tabular-nums"
          data-slot="game-card-rank-label"
        >
          {card.value}
        </span>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        ref={buttonRef}
        className={className}
        style={style}
        data-card-suit={card.suit}
        data-slot="game-card"
        type="button"
        disabled={disabled}
        aria-pressed={selected || undefined}
        aria-label={label}
        onClick={onClick}
      >
        {contents}
      </button>
    );
  }

  return (
    <span
      className={className}
      style={style}
      data-card-suit={card.suit}
      data-slot="game-card"
      role="img"
      aria-label={label}
    >
      {contents}
    </span>
  );
}
