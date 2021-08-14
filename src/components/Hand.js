import classNames from "classnames"
import { CrewCard } from "./Card"

export function CrewHand(props) {
    const hand = [...props.hand]
    if (props.sort) {
        hand.sort((card1, card2) => {
            return card1.suite === card2.suite ? card1.num - card2.num : (card1.suite < card2.suite ? -1 : 1)
        })
    }

    const cards = hand.map((card, idx) =>
        <div
            className="mx-2"
            style={{
                'zIndex': idx,
            }}
        >
            <CrewCard key={idx} num={card.num} suite={card.suite} faceDown={props.faceDown || card.faceDown} pi={props.pi} />
        </div>
    )

    return (
        <div className="flex">
            {cards}
        </div>
    )
}