import classnames from "classnames"

import { CrewPanel } from "./Panel"

import { mapPlayersToGridsClass } from "../util/maps";

export function CrewPanels({ state, setState, game, setGame, view, setView }) {
    const panels = []
    for (let i = 0; i < game.num_players; i++) {
        panels.push(<CrewPanel key={i} idx={i} state={game} setState={setState} />)
    }

    return (
        <div className="mb-5">
            <div className={classnames("grid divide-x-2 divide-gray-200", mapPlayersToGridsClass[game.num_players])} >
                {panels}
            </div >
        </div >
    )
}