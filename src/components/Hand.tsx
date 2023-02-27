import { Play } from "../util/actions/play";
import { Card } from "./Card";

export function Hand({ state, setState, game, setGame }) {
  let hand = [];
  if (
    game.players &&
    game.players[state.player] &&
    game.players[state.player].hand
  ) {
    hand = game.players[state.player].hand;
  }

  const cards = hand.map((card, idx) => (
    <div
      key={idx}
      onClick={() => {
        new Play(state, setState, game, setGame).run(idx);
      }}
    >
      <Card
        state={state}
        setState={setState}
        game={game}
        setGame={setGame}
        card={card}
      />
    </div>
  ));

  return <div className="flex space-x-2">{cards}</div>;
}
