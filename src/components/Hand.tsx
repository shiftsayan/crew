import { Card } from "./Card"

export function Hand({ state, setState, game, setGame, sorted }) {
    let hand = []
    if (game.players && game.players[state.player] && game.players[state.player].hand) {
        hand = [...game.players[state.player].hand]
    }
    if (sorted) sortHand(hand)

    const cards = hand.map((card, idx) =>
        <div key={idx} onClick={() => { }}>
            <Card state={state} setState={setState} card={card} />
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