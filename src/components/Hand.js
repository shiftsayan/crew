import { CrewCard } from "./Card"

export function CrewHand(props) {
    const cards = props.hand.map((card, idx) => <CrewCard key={idx} num={card.num} suite={card.suite} faceDown={props.faceDown || card.faceDown} />)

    return (
        <div className="flex">
            {cards}
        </div>
    )
}