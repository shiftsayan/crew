import { Communication } from "../enums";
import { suitTrump } from "../game";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class PlayMove extends Move<[number]> {
  name = "Play";

  async validateParams(cardIdx: number): Promise<string | void> {
    // invalid card index
    const xCardIdx =
      cardIdx < 0 ||
      cardIdx >= this.game.players[this.state.player].hand.length;
    const card = this.game.players[this.state.player].hand[cardIdx];

    // invalid card during `PlayTrick` phase
    const xPlay =
      this.game.phase === PhaseName.PlayTrick &&
      this.game.leadingTrick &&
      this.game.leadingTrick[this.state.player];

    // invalid card suite during `PlayTrick` phase
    const xSuite =
      this.game.phase === PhaseName.PlayTrick &&
      this.game.leadingTrick && // if this trick has been started
      card.suite !== this.game.leadingSuite && // and card's suite does not match leading suite
      this.game.players[this.state.player].hand.some(
        (iterCard) => iterCard.suite === this.game.leadingSuite // then the player must not have a card of the leading suite.
      );

    // invalid card during `Communicate` phase
    const xCommunication =
      this.game.phase === PhaseName.Communicate &&
      (this.game.players[this.state.player].communication.card ||
        card.suite === suitTrump);

    if (!xCardIdx && !xPlay && !xSuite && !xCommunication) {
      return;
    } else {
      return "Invalid card";
    }
  }

  updateGame(cardIdx: number) {
    const card = this.game.players[this.state.player].hand[cardIdx];

    const newHand = this.game.players[this.state.player].hand.filter(
      (_, iterIdx) => iterIdx !== cardIdx
    );

    const playedCards = this.game.playedCards ?? [];
    playedCards.push(card);

    if (this.game.phase === PhaseName.Communicate) {
      return {
        players: {
          [this.state.player]: {
            communication: {
              qualifier: Communication.Communicating,
              card: card,
            },
          },
        },
      };
    } else if (this.game.phase === PhaseName.PlayTrick) {
      return {
        players: {
          [this.state.player]: {
            hand: newHand,
          },
        },
        playedCards: playedCards,
        leadingTrick: {
          [this.state.player]: card,
        },
        leadingSuite: this.game.leadingSuite || card.suite,
      };
    }
  }
}
