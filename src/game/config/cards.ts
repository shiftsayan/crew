import type { Card, CardId, Suit } from "../contracts";

export const SUITS = [
  "blue",
  "green",
  "pink",
  "yellow",
  "trump",
] as const satisfies readonly Suit[];

export const NON_TRUMP_SUITS = [
  "blue",
  "green",
  "pink",
  "yellow",
] as const satisfies readonly Suit[];

function makeCard(suit: Suit, value: number): Card {
  return {
    id: `${suit}-${value}` as CardId,
    suit,
    value,
  };
}

export const CARD_DECK: readonly Card[] = Object.freeze(
  SUITS.flatMap((suit) =>
    Array.from(
      { length: suit === "trump" ? 4 : 9 },
      (_, index) => makeCard(suit, index + 1),
    ),
  ),
);

export const CARD_IDS: readonly CardId[] = Object.freeze(
  CARD_DECK.map((card) => card.id),
);

export const NON_TRUMP_CARDS: readonly Card[] = Object.freeze(
  CARD_DECK.filter((card) => card.suit !== "trump"),
);

export const NON_TRUMP_CARD_IDS: readonly CardId[] = Object.freeze(
  NON_TRUMP_CARDS.map((card) => card.id),
);

const cardsById = new Map(CARD_DECK.map((card) => [card.id, card]));

export function getCard(cardId: CardId): Card {
  const card = cardsById.get(cardId);
  if (!card) {
    throw new Error(`Unknown card: ${cardId}`);
  }
  return card;
}

export function compareCardsForHand(leftId: CardId, rightId: CardId): number {
  const left = getCard(leftId);
  const right = getCard(rightId);
  const leftSuit = SUITS.indexOf(left.suit);
  const rightSuit = SUITS.indexOf(right.suit);
  return leftSuit === rightSuit
    ? right.value - left.value
    : leftSuit - rightSuit;
}
