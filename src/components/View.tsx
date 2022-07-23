import { CrewPill as Pill } from "./Pill"
import { CrewGoal } from "./Goal"

import { mapMissionVersionToEmoji } from "../util/maps"
import { Decoration, Order, ViewName } from "../util/enums"
import { SUITES, SUIT_TRUMP } from "../util/game"
import { PhaseName } from "../util/mechanics/phase"
import { Toggle } from "../util/actions/toggle"

export const GOAL_VIEW_PHASES = [
    PhaseName.Lobby,
    PhaseName.Preflight,
    PhaseName.DealCards,
    PhaseName.DealGoals,
    PhaseName.ChooseGoals,
    PhaseName.GoldenBorderDiscard,
    PhaseName.GoldenBorderAccept,
]

export function View({ state, setState, game, setGame }) {
    var view = undefined
    if (GOAL_VIEW_PHASES.includes(game.phase)) {
        view = <GoalView state={state} setState={setState} game={game} setGame={setGame} />
    }
    else {
        view = state.view === ViewName.Trick
            ? <TrickView state={state} setState={setState} game={game} setGame={setGame} />
            : <TableView state={state} setState={setState} game={game} setGame={setGame} />
    }

    return (
        <div className="h-full w-full m-auto flex-grow justify-between">
            {view}
        </div>
    )
}

function TrickView({ state, setState, game, setGame }) {
    const col_classes = "flex flex-col -my-3 p-3 justify-between rounded-lg hover:bg-slate-200 transition duration-300 ease-in-out"
    const grid = []

    var firstCol = []
    for (let j = 0; j < game.num_players; j++) {
        firstCol.push(
            <Header text={game.seating[j]} />
        )
    }
    grid.push(
        <div className={col_classes} key="first">
            {firstCol}
        </div>
    )

    for (let trick of (game.tricks ?? [])) {
        const col = []
        for (let j = 0; j < game.num_players; j++) {
            const player = game.seating[j]
            col.push(
                <Pill
                    key={j}
                    num={trick[player].num}
                    suite={trick[player].suite}
                />
            )
        }
        grid.push(
            <div className={col_classes}>
                {col}
            </div>
        )
    }

    if (game.leading_trick) {
        var last_col = []
        for (let j = 0; j < game.num_players; j++) {
            const player = game.seating[j]
            last_col.push(
                <Pill
                    key={j}
                    num={game.leading_trick[player]?.num}
                    suite={game.leading_trick[player]?.suite}
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

    for (let suite of SUITES) {
        var row = [
            <Header key={suite} text={suite} />
        ]
        for (let i = 1; i <= (suite === SUIT_TRUMP ? 4 : 9); i++) {
            let played = game.played_cards && game.played_cards.some((card) => (card.num === i && card.suite === suite))
            row.push(
                <CrewGoal key={i} goal={{ num: i, suite: suite, order: Order.None }} decorations={{
                    [Decoration.Grayscale]: played,
                    [Decoration.Shrink]: played,
                }
                }
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
        <div className="flex bg-white rounded-md justify-between h-8 w-20 text-sm">
            <div className="m-auto truncate p-1">
                {text}
            </div>
        </div>
    )
}

function GoalView({ state, setState, game, setGame }) {
    const goals = game.goals || []

    const breakpoint = goals.length >= 6 ? Math.ceil(goals.length / 2) : goals.length

    const goals_grid = []
    const row_classes = "flex justify-center space-x-20"
    var row = []
    for (let i = 0; i < goals.length; i++) {
        row.push(
            <div
                className="cursor-grab"
                key={i}
                onClick={() => new Toggle(state, setState, game, setGame).run(i)}
            >
                <CrewGoal key={i} goal={goals[i]} decorations={{
                    [Decoration.Display]: true,
                    [Decoration.Shrink]: Boolean(goals[i].player),
                    [Decoration.Desaturate]: Boolean(goals[i].player),
                }} />
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
                        {mapMissionVersionToEmoji[game.mission.version]}
                    </div>
                    <div className="m-auto font-bold">
                        Mission {game.mission.num}
                    </div>
                </div>
            </div>
            <div className="w-full flex flex-col h-full space-y-20 justify-center">
                {goals_grid}
            </div>
        </div>
    )
}

