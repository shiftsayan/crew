import classNames from "classnames"
import { CrewCard } from "./Card"

export function CrewHand(props) {
    const cards = props.hand.map((card, idx) =>
        <div className={classNames({
            "mx-1": props.pi % 2 === 0,
            "my-1": props.pi % 2 === 1,
        })}>
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