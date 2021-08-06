import { CrewHand } from "./Hand";

// onClick(id) {
//   this.props.moves.clickCell(id);
// }

const cards = [
  {'num': '1', 'suite': 'red'},
  {'num': '4', 'suite': 'black'},
  {'faceDown': true},
]

export function CrewBoard(props) {
  return (
    <>
      <div className="p-12">
        <CrewHand cards={cards}/>
      </div>
    </>
  )
}
