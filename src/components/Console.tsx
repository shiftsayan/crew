import { HUD } from "./HUD"
import { Panels } from "./Panels"

export function Console({ state, setState, game, setGame, view, setView }) {
    return (
        <div className="flex-grow bg-gray-100 rounded-b-2xl mx-8 overflow-scroll">
            <div className="w-full h-full flex flex-col">
                {/* <HUD state={state} setState={setState} /> */}
                <Panels state={state} setState={setState} game={game} setGame={setGame} view={view} setView={setView} />
            </div>
        </div>
    )
}