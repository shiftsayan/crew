import { CrewCard } from "./Card";

// onClick(id) {
//   this.props.moves.clickCell(id);
// }

export function CrewBoard(props) {
  return (
    <>
      <div className="p-12">
        <CrewCard num='5' suite='red' faceDown />
      </div>
    </>
  )
}
