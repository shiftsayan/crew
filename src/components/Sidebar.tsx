import classnames from "classnames"

import { FiInfo } from "react-icons/fi"
import { Move, Phase, View } from "../util/enums"
import { check_agency, performMove } from "../util/moves"
import { GOAL_VIEW_PHASES } from "./View"

export function CrewSidebar({ state, setState }) {
    return (
        <div className="w-64 flex flex-col space-y-4 justify-center bg-white rounded-2xl">
            <div className="mx-auto flex justify-center space-x-2">
                <div className="m-auto">
                    {state.team.icon}
                </div>
                <div className="m-auto font-bold">
                    {state.team.name}
                </div>
            </div>
            <div className="mx-auto grid grid-cols-2 gap-x-4">
                <CrewSidebarCounter label="Mission" value={state.mission.num} icon={<FiInfo />} />
                <CrewSidebarCounter label="Attempt" value={state.attempt} />
            </div>
            <CrewSidebarToggle state={state} setState={setState} />
            <CrewSidebarCTA state={state} setState={setState} />
        </div>
    )
}

function CrewSidebarCounter({ label, value, icon = null }) {
    return (
        <div className="flex-col">
            <div className="mx-auto uppercase text-sm">
                {label}
            </div>
            <div className="m-auto flex justify-center pt-1 space-x-1">
                <div className="font-mono text-sm">
                    {value}
                </div>
                <div className="m-auto">
                    {icon}
                </div>
            </div>
        </div>
    )
}

function CrewSidebarToggle({ state, setState }) {
    return (
        <div className="flex-col mx-auto" >
            <div className={classnames({
                "mx-auto uppercase text-sm": true,
                "text-gray-300": GOAL_VIEW_PHASES.includes(state.phase),
            })}>
                {state.view === View.Table ? "Table View" : "Trick View"}
            </div>
            <div className="mx-auto pt-1">
                <label className={classnames({
                    "flex": true,
                    "cursor-pointer": GOAL_VIEW_PHASES.includes(state.phase),
                    "cursor-not-allowed": GOAL_VIEW_PHASES.includes(state.phase),
                })}>
                    <input
                        type="checkbox"
                        className="hidden"
                        onClick={() => setState({
                            ...state,
                            view: (state.view === View.Table ? View.Trick : View.Table),
                        })}
                        disabled={GOAL_VIEW_PHASES.includes(state.phase)}
                    />
                    <div className={classnames({
                        "w-14 h-8 rounded-full transition mx-auto relative": true,
                        "bg-gray-300": GOAL_VIEW_PHASES.includes(state.phase),
                        "bg-gray-500": state.view === View.Trick,
                        "bg-blue-500": state.view === View.Table,
                    })}>
                        <div className={classnames({
                            "absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition": true,
                            "translate-x-full": state.view === View.Table,
                        })} />
                    </div>
                </label>
            </div>
        </div >
    )
}

function CrewSidebarCTA({ state, setState }) {
    const buttons_data = []
    switch (state.phase) {
        case Phase.Preflight:
            buttons_data.push({
                text: 'Start',
                style: 'positive',
                onClick: () => performMove(state, setState, Move.StartGame, {})
            })
            break
        case Phase.Goal:
            if (check_agency(state)) {
                buttons_data.push({
                    text: 'Choose Goal',
                    style: 'info',
                })
            }
            break
        case Phase.GoldenBorderDiscard:
            if (check_agency(state)) {
                buttons_data.push({
                    text: 'Continue',
                    style: 'positive',
                    onClick: () => performMove(state, setState, Move.SkipGoldenBorder, {})
                })
            }
            break
        // else 
        // default:
        //     buttons_data.push({ 'text': 'Waiting...', 'style': 'neutral' })
        //     break
    }
    if (buttons_data.length === 0) {
        buttons_data.push({ 'text': 'Waiting...', 'style': 'neutral' })
    }
    // if (state.phase === "GoldenBorder") {
    //     if (state.this_player === state.commander && state.allow_exchange === undefined) {
    //         buttons_data.push({ 'text': 'Allow', 'style': 'positive', 'onClick': () => state.moves.AllowExchange(true) })
    //         buttons_data.push({ 'text': 'Disallow', 'style': 'negative', 'onClick': () => state.moves.AllowExchange(false) })
    //     }
    //     else {
    //         buttons_data.push({ 'text': 'Waiting...', 'style': 'neutral' })
    //     }
    // }
    // else {

    // }

    const buttons = buttons_data.map(({ text, style, onClick }, idx) =>
        <div key={idx} onClick={onClick} className={classnames({
            "flex rounded-md justify-center m-auto": true,
            "bg-blue-600": style === 'positive',
            "bg-red-600": style === 'negative',
            "bg-gray-600": style === 'neutral',
            "bg-gray-400": style === 'info',
            "hover:shadow-lg hover:cursor-pointer": style === 'positive' || style === 'negative',
            "hover:cursor-not-allowed": style === 'neutral',
        })}>
            <div className="m-auto truncate py-2 px-3 uppercase text-sm font-bold text-white">
                {text}
            </div>
        </div>
    )

    return (
        <div className="flex justify-around px-2">
            {buttons}
        </div>
    )
}