import { CrewHand } from "./Hand";
import { CrewPile } from "./Pile";

const cards = [
  {'num': '1', 'suite': 'red'},
  {'num': '4', 'suite': 'black'},
  {'faceDown': true},
]

export function CrewBoard(props) {
  const currentPlayer = props.ctx.currentPlayer
  const hands = Object.keys(props.G.players).map((player) => <CrewHand key={player} hand={props.G.players[player].hand.slice(0, 8)} faceDown={player !== currentPlayer} />) // TODO

  return (
    <>
      <div className="p-12">
        <CrewPile cards={cards} />
      </div>
    </>
  )
}
