import { CrewCard } from "./Card"

export function CrewHand(props) {
    const cards = props.hand.map((card, idx) => <CrewCard num={card.num} suite={card.suite} faceDown={props.faceDown || card.faceDown} key={idx} />)

    return (
        <div className="flex">
            {cards}
        </div>
    )
}