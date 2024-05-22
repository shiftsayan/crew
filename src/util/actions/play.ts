import { Communication } from "../enums";
import { SUIT_TRUMP } from "../game";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class PlayMove extends Move<[number]> {
  name = "Play";

  async validateParams(card_idx: number): Promise<string | void> {
    // invalid card index
    const xCardIdx =
      card_idx < 0 ||
      card_idx >= this.game.players[this.state.player].hand.length;
    const card = this.game.players[this.state.player].hand[card_idx];

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
        (_card) => _card.suite === this.game.leadingSuite // then the player must not have a card of the leading suite.
      );

    // invalid card during `Communicate` phase
    const xCommunication =
      this.game.phase === PhaseName.Communicate &&
      (this.game.players[this.state.player].communication.card ||
        card.suite === SUIT_TRUMP);

    if (!xCardIdx && !xPlay && !xSuite && !xCommunication) {
      return;
    } else {
      return "Invalid card";
    }
  }

  updateGame(card_idx: number) {
    const card = this.game.players[this.state.player].hand[card_idx];

    const new_hand = this.game.players[this.state.player].hand.filter(
      (_, idx) => idx !== card_idx
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
            hand: new_hand,
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
