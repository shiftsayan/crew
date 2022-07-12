import { Hand } from "./Hand"

export function Dock({ state, setState, game, setGame }) {
    return (
        <div className="mx-8 h-36 bg-gray-200 flex justify-center rounded-t-2xl">
            <div className="m-auto">
                <Hand state={state} setState={setState} game={game} setGame={setGame} sorted />
            </div>
        </div>
    )
}