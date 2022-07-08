import { CrewCard } from "./Card"

import { Move, Phase } from "../util/enums"
import { performMove } from "../util/moves"

export function CrewHand({ state, setState, sorted }) {
    const hand = [...state.players[state.this_player].hand]
    if (sorted) sortHand(hand)

    var move = (state.phase === Phase.Communication) ? Move.CommunicateCard : Move.PlayCard

    const cards = hand.map((card, idx) =>
        <div key={idx} onClick={() => performMove(state, setState, move, { card: card })}>
            <CrewCard state={state} setState={setState} card={card} />
        </div>
    )

    return (
        <div className="flex space-x-2">
            {cards}
        </div>
    )
}

function sortHand(hand) {
    hand.sort((card1, card2) => {
        return card1.suite === card2.suite ? card1.num - card2.num : (card1.suite < card2.suite ? -1 : 1)
    })
}