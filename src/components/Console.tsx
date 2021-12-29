import { CrewHUD } from "./HUD"
import { CrewPanels } from "./Panels"

export function CrewConsole({ state, setState }) {
    return (
        <div className="flex-grow bg-gray-100 rounded-b-2xl mx-8 overflow-scroll">
            <div className="w-full h-full flex flex-col">
                <CrewHUD state={state} setState={setState} />
                <CrewPanels state={state} setState={setState} />
            </div>
        </div>
    )
}