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
            className={classNames({
                "mx-1": !props.condense && props.pi % 2 === 0,
                "-mx-4": props.condense && props.pi % 2 === 0,
                "my-1": !props.condense && props.pi % 2 === 1,
                "-my-4": props.condense && props.pi % 2 === 1,
            })}
            style={{
                'zIndex': idx,
            }}
        >
            <CrewCard key={idx} num={card.num} suite={card.suite} faceDown={props.faceDown || card.faceDown} pi={props.pi} />
        </div>
    )

    return (
        <div className={classNames({
            "flex": true,
            "flex-col": props.pi % 2 === 1,
        })}>
            {cards}
        </div>
    )
}