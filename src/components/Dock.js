import { CrewHand } from "./Hand"

export function CrewDock(props) {
    return (
        <div className="w-full h-36 bg-gray-200 flex justify-center">
            <div className="m-auto">
                <CrewHand hand={props.hand} pi={0} sort />
            </div>
        </div>
    )
}