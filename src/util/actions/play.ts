import { Communication } from "../enums";
import { SUIT_TRUMP } from "../game";
import { PhaseName } from "../mechanics/phase";
import { Move } from "./move";

export class Play extends Move<[number]> {
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
      this.game.leading_trick &&
      this.game.leading_trick[this.state.player];

    // invalid card suite during `PlayTrick` phase
    const xSuite =
      this.game.phase === PhaseName.PlayTrick &&
      this.game.leading_trick && // if this trick has been started
      card.suite !== this.game.leading_suite && // and card's suite does not match leading suite
      this.game.players[this.state.player].hand.some(
        (_card) => _card.suite === this.game.leading_suite // then the player must not have a card of the leading suite.
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

    const played_cards = this.game.played_cards ?? [];
    played_cards.push(card);

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
        played_cards: played_cards,
        leading_trick: {
          [this.state.player]: card,
        },
        leading_suite: this.game.leading_suite || card.suite,
      };
    }
  }
}
