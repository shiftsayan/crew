import { CrewHand } from "./Hand";

export function CrewBoard(props) {
  const currentPlayer = props.ctx.currentPlayer
  const hands = Object.keys(props.G.players).map((player) => <CrewHand key={player} hand={props.G.players[player].hand.slice(0, 8)} currentPlayer={player === currentPlayer} />) // TODO

  return (
    <>
      <div className="p-12">
        {hands}
      </div>
    </>
  )
}
