import classnames from "classnames";

import { Card } from "./Card";
import { CrewGoal } from "./Goal";

import { mapNumberToEmoji } from "../util/maps";
import { Phase } from "../util/enums";

export function Panel({ idx, state, setState, game, setGame }) {
    const player = game.seating[idx]
    const player_data = game.players[player]

    const current_trick = game.tricks[game.tricks.length - 1]
    const card = current_trick ? current_trick[player] : {}

    const goals = player_data.goals
        ? player_data.goals.map((goal, idx) => <CrewGoal key={idx} goal={goal} dimmed={goal.accomplished} />)
        : []
    // if (state.phase === Phase.Goal || state.phase === Phase.GoldenBorderAccept) {
    goals.push(<CrewGoal key="blank" blank />)
    // }

    return (
        <div className="h-full bg-gray-100">
            {/* Title */}
            <div className="w-full h-12 flex justify-center space-x-2">
                <div className="my-auto">
                    {player}
                </div>
                <div className="h-10 bg-white rounded-full my-auto flex justify-between px-2 space-x-1">
                    {idx === game.commander && <Badge emoji="👑" />}
                    <Badge emoji={mapNumberToEmoji[player_data.tricks_won]} />
                </div>
            </div>
            {/* Cards */}
            <div className="w-full mt-1 justify-around px-4 flex">
                <Card card={card} state={state} setState={setState} game={game} setGame={setGame} />
                <Card card={player_data.communication.card} communication={player_data.communication.qualifier} state={state} setState={setState} game={game} setGame={setGame} />
            </div>
            {/* Goals */}
            <div className={classnames({
                "w-full h-8 mt-2 justify-around flex": true,
                // "px-4": state.players[idx].goals.length !== 4,
            })}>
                {goals}
            </div>
        </div>
    )
}

function Badge({ emoji }) {
    return (
        <div className="my-auto h-7 w-7 flex justify-center rounded-full">
            <div className='z-10 m-auto'>
                {emoji}
            </div>
        </div>
    )
}

