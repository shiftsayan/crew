import { CrewCard } from "./Card"

function getRandomNumberInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

export function CrewPile(props) {
    const cards = props.cards.map((card, idx) => 
        <div 
            className="absolute inset-1/2" 
            style={{
                transform: `translate(${getRandomNumberInRange(-3, 3)}rem, ${getRandomNumberInRange(-3, 3)}rem) rotate(${getRandomNumberInRange(-30, 30)}deg)`,
            }}
        >
                <CrewCard num={card.num} suite={card.suite} faceDown={card.faceDown} key={idx} float/>
        </div>
    )

    return (
        <div className="h-72 w-72 relative">
            {cards}
        </div>
    )
}