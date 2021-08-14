import classNames from 'classnames'

import { calculatePi } from "../util/placement"

import { CrewHand } from "./Hand"

export function CrewHands(props) {
    const hands = Object.keys(props.players).map(function f(player) {
        const pi = calculatePi(parseInt(player), parseInt(props.currentPlayer), parseInt(props.numPlayers))

        return <div
            className={classNames({
                'absolute': true,
                'bottom-0 pb-4 left-1/2 transform -translate-x-1/2': pi === 0,
                'right-0 pr-4 top-1/2 transform -translate-y-1/2': pi === 1,
                'top-0 pt-4 left-1/2 transform -translate-x-1/2': pi === 2,
                'left-0 pl-4 top-1/2 transform -translate-y-1/2': pi === 3,
            })}
        >
            <CrewHand
                key={player}
                hand={props.players[player].hand}
                faceDown={player !== props.currentPlayer}
                pi={pi}
            />
        </div>
    })

    return (
        <div className="relative h-full w-full">
            {hands}
        </div>
    )
}