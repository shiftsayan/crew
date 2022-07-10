import classNames from "classnames";

import { CrewCard } from "./Card";
import { CrewGoal } from "./Goal";

import { mapNumberToEmoji } from "../util/maps";
import { Phase } from "../util/enums";

export function Panel({ idx, state, setState }) {
    // const goals = state.players[idx].goals.map((goal, idx) => <CrewGoal key={idx} goal={goal} dimmed={goal.accomplished} />)
    // if (state.phase === Phase.Goal || state.phase === Phase.GoldenBorderAccept) {
    //     goals.push(<CrewGoal key="blank" blank />)
    // }
    const goals = []

    var played_card = {}
    if (state.current_trick)
        played_card = state.current_trick[idx]

    return (
        <div className="h-full bg-gray-100">

            <div className="w-full h-12 flex justify-center space-x-2">
                <div className="my-auto">
                    {state.players[idx].name}
                </div>
                <div className="h-10 bg-white rounded-full my-auto flex justify-between px-2 space-x-1">
                    {idx === state.commander && <CrewPanelBadge emoji="👑" />}
                    <CrewPanelBadge emoji={mapNumberToEmoji[state.players[idx].tricks_won]} />
                </div>
            </div>

            {/* <div className="w-full mt-1 justify-around px-4 flex">
                <CrewCard state={state} setState={setState} card={played_card} />
                <CrewCard state={state} setState={setState} card={state.players[idx].communication_card} communication={state.players[idx].communication_qualifier} />
            </div> */}

            {/* <div className={classNames({
                "w-full h-8 mt-2 justify-around flex": true,
                "px-4": state.players[idx].goals.length !== 4,
            })}>
                {goals}
            </div> */}
        </div>
    )
}

function CrewPanelBadge({ emoji }) {
    return (
        <div className="my-auto h-7 w-7 outline outline-1 outline-slate-100 flex justify-center rounded-full">
            <div className='z-10 m-auto'>
                {emoji}
            </div>
            {/* <div className="z-0 absolute blur">
                {emoji}
            </div> */}
        </div>
    )
}
