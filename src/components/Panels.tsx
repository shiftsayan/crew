import classnames from "classnames"

import { CrewPanel } from "./Panel"

import { mapPlayersToGridsClass } from "../util/maps";

export function CrewPanels({ state, setState }) {
    const panels = []
    for (let i = 0; i < state.num_players; i++) {
        panels.push(<CrewPanel key={i} idx={i} state={state} setState={setState} />)
    }

    return (
        <div className="mb-5">
            <div className={classnames("grid divide-x-2 divide-gray-200", mapPlayersToGridsClass[state.num_players])} >
                {panels}
            </div >
        </div >
    )
}