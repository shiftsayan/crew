import { CrewHand } from "./Hand";

export function CrewBoard(props) {
  const currentPlayer = props.ctx.currentPlayer
  const hands = Object.keys(props.G.players).map((player) => <CrewHand hand={props.G.players[player].hand.slice(0, 8)} faceDown={player === currentPlayer} key={player} />) // TODO

  return (
    <>
      <div className="p-12">
        {hands}
      </div>
    </>
  )
}
