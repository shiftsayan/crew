import type {
  CardId,
  CommunicationQualifier,
  GameState,
  Trick,
} from "../contracts";
import { getCard } from "../config";

export function nextPlayerId(
  seatOrder: readonly string[],
  playerId: string,
): string {
  const index = seatOrder.indexOf(playerId);
  if (index < 0) {
    throw new Error(`Player ${playerId} is not seated.`);
  }
  return seatOrder[(index + 1) % seatOrder.length];
}

export function getPlayableCardIds(
  state: GameState,
  playerId: string,
): CardId[] {
  if (
    (state.phase !== "between-tricks" &&
      state.phase !== "playing-trick") ||
    state.currentPlayerId !== playerId
  ) {
    return [];
  }

  const player = state.players[playerId];
  if (!player) {
    return [];
  }

  const ledPlay = state.currentTrick?.plays[0];
  if (!ledPlay) {
    return [...player.hand];
  }

  const ledSuit = getCard(ledPlay.cardId).suit;
  const matching = player.hand.filter(
    (cardId) => getCard(cardId).suit === ledSuit,
  );
  return matching.length > 0 ? matching : [...player.hand];
}

export function getCommunicationQualifiers(
  state: GameState,
  playerId: string,
  cardId: CardId,
): CommunicationQualifier[] {
  const player = state.players[playerId];
  if (
    !player ||
    state.phase !== "between-tricks" ||
    player.hasCommunicated ||
    getCard(cardId).suit === "trump" ||
    !player.hand.includes(cardId)
  ) {
    return [];
  }

  const card = getCard(cardId);
  const sameSuit = player.hand
    .map(getCard)
    .filter((candidate) => candidate.suit === card.suit);

  if (sameSuit.length === 1) {
    return ["only"];
  }

  const values = sameSuit.map((candidate) => candidate.value);
  const qualifiers: CommunicationQualifier[] = [];
  if (card.value === Math.max(...values)) {
    qualifiers.push("highest");
  }
  if (card.value === Math.min(...values)) {
    qualifiers.push("lowest");
  }
  return qualifiers;
}

export function determineTrickWinner(trick: Trick): string {
  const firstPlay = trick.plays[0];
  if (!firstPlay) {
    throw new Error("Cannot determine the winner of an empty trick.");
  }
  const ledSuit = getCard(firstPlay.cardId).suit;
  let winningPlay = firstPlay;

  for (const play of trick.plays.slice(1)) {
    const winningCard = getCard(winningPlay.cardId);
    const card = getCard(play.cardId);
    const winsWithTrump =
      card.suit === "trump" && winningCard.suit !== "trump";
    const winsSameSuit =
      card.suit === winningCard.suit && card.value > winningCard.value;
    const winsLedSuit =
      winningCard.suit !== "trump" &&
      winningCard.suit !== ledSuit &&
      card.suit === ledSuit;

    if (winsWithTrump || winsSameSuit || winsLedSuit) {
      winningPlay = play;
    }
  }

  return winningPlay.playerId;
}
