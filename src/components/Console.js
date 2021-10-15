import { CrewDock } from "./Dock"
import { CrewPanels } from "./Panels"

export function CrewConsole(props) {
    return (
        <div className="w-full h-3/5 bg-gray-50 rounded-3xl overflow-hidden flex flex-col">
            <CrewPanels
                numPlayers={props.numPlayers}
                thisPlayer={props.thisPlayer}
                currentPlayer={props.currentPlayer}
                color={props.color}
            />
            <CrewDock hand={props.hand} />
        </div>
    )
}