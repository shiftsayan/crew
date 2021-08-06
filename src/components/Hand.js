import { CrewCard } from "./Card"

export function CrewHand(props) {
    const cards = props.cards.map((card, idx) => <CrewCard num={card.num} suite={card.suite} faceDown={card.faceDown} id={idx} />)

    return (
        <div className="flex">
            {cards}
        </div>
    )
}