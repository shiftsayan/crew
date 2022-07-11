import { CrewPill } from "./Pill"
import { CrewGoal } from "./Goal"

import { mapMissionVersionToEmoji } from "../util/maps"
import { Move, Phase, ViewName } from "../util/enums"
import { performMove } from "../util/moves"

export const GOAL_VIEW_PHASES = [Phase.Preflight, Phase.Goal, Phase.GoldenBorderDiscard, Phase.GoldenBorderAccept]

export function View({ state, setState, game, setGame }) {
    var view = undefined
    if (GOAL_VIEW_PHASES.includes(state.phase)) {
        view = <GoalView state={state} setState={setState} game={game} setGame={setGame} />
    }
    else {
        view = state.view === ViewName.Trick
            ? <TrickView state={state} setState={setState} game={game} setGame={setGame} />
            : <TableView state={state} setState={setState} game={game} setGame={setGame} />
    }

    return (
        <div className="h-full w-full m-auto flex-grow justify-between">
            {/* {view} */}
        </div>
    )
}

function TrickView({ state, setState, game, setGame }) {
    const col_classes = "flex flex-col -my-3 p-3 justify-between rounded-lg hover:bg-slate-200 transition duration-300 ease-in-out"
    const grid = []

    var firstCol = []
    for (let j = 0; j < state.num_players; j++) {
        firstCol.push(
            <Header text={state.players[j].name} />
        )
    }
    grid.push(
        <div className={col_classes} key="first">
            {firstCol}
        </div>
    )

    for (let trick of state.all_tricks) {
        var col = []
        for (let j = 0; j < state.num_players; j++) {
            col.push(
                <CrewPill
                    key={j}
                    num={trick[j].num}
                    suite={trick[j].suite}
                />
            )
        }
        grid.push(
            <div className={col_classes}>
                {col}
            </div>
        )
    }

    if (state.current_trick) {
        var last_col = []
        for (let j = 0; j < state.num_players; j++) {
            last_col.push(
                <CrewPill
                    key={j}
                    num={state.current_trick[j].num}
                    suite={state.current_trick[j].suite}
                />
            )
        }
        grid.push(
            <div className={col_classes} key="last">
                {last_col}
            </div>
        )
    }

    return (
        <div className="flex h-full">
            {grid}
        </div>
    )
}

function TableView({ state, setState, game, setGame }) {
    const grid = []

    for (let suite of state.suites) {
        var row = [
            <Header text={suite} />
        ]
        for (let i = 1; i <= (suite === state.trump_suit ? 4 : 9); i++) {
            let played = state.played_cards.some((card) => (card.num === i && card.suite === suite))
            row.push(
                <CrewPill
                    key={i}
                    num={i}
                    suite={suite}
                    dimmed={played}
                />
            )
        }
        grid.push(
            <div key={suite} className="flex w-fit -my-2 -mx-3 py-2 px-3 space-x-6 rounded-lg hover:bg-slate-200 transition duration-300 ease-in-out">
                {row}
            </div>
        )
    }

    return (
        <div className="flex flex-col px-3 justify-between h-full w-full">
            {grid}
        </div>
    )
}

function Header({ text }) {
    return (
        <div className="flex bg-white rounded-md justify-between h-8 w-20">
            <div className="m-auto truncate p-1">
                {text}
            </div>
        </div>
    )
}

function GoalView({ state, setState, game, setGame }) {
    const breakpoint = state.goals.length >= 6 ? Math.ceil(state.goals.length / 2) : state.goals.length

    const goals_grid = []
    const row_classes = "flex justify-center space-x-20"
    var row = []
    for (let i = 0; i < state.goals.length; i++) {
        row.push(
            <div className="cursor-grab" onClick={() => performMove(state, setState, Move.ToggleGoal, { goal_idx: i })} key={i} >
                <CrewGoal idx={i} goal={state.goals[i]} display dimmed={state.goals[i].player} />
            </div>
        )
        if (row.length === breakpoint) {
            goals_grid.push(
                <div className={row_classes} key={i}>
                    {row}
                </div>
            )
            row = []
        }
    }
    if (row.length > 0)
        goals_grid.push(
            <div className={row_classes} key="last">
                {row}
            </div>
        )


    return (
        <div className="h-full flex">
            <div className="w-64 flex flex-col space-y-4 justify-center bg-white rounded-2xl">
                <div className="mx-auto flex justify-center space-x-2">
                    <div className="m-auto">
                        {mapMissionVersionToEmoji[state.mission.version]}
                    </div>
                    <div className="m-auto font-bold">
                        Mission {state.mission.num}
                    </div>
                </div>
            </div>
            <div className="w-full flex flex-col h-full space-y-20 justify-center">
                {goals_grid}
            </div>
        </div>
    )
}

