import { CrewSidebar } from "./Sidebar"
import { CrewView } from './View'

export function CrewHUD({ state, setState }) {
    return (
        <div className="w-full h-full flex-grow bg-gray-100 flex justify-center rounded-2xl py-6 px-8">
            <CrewView state={state} setState={setState} />
            <CrewSidebar state={state} setState={setState} />
        </div>
    )
}
