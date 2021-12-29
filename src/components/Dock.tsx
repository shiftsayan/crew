import { CrewHand } from "./Hand"

export function CrewDock({ state, setState }) {
    return (
        <div className="mx-8 h-36 bg-gray-200 flex justify-center overflow-scroll rounded-t-2xl">
            <div className="m-auto">
                <CrewHand state={state} setState={setState} sorted />
            </div>
        </div>
    )
}