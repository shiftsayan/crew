import { Hand } from "./Hand"

export function Dock({ state, setState, game, setGame, view, setView }) {
    return (
        <div className="mx-8 h-36 bg-gray-200 flex justify-center overflow-scroll rounded-t-2xl">
            {/* <div className="m-auto">
                <CrewHand state={state} setState={setState} game={game} setGame={setGame} view={view} setView={setView} sorted />
            </div> */}
        </div>
    )
}