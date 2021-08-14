import classNames from "classnames"
import { CrewPanel } from "./Panel"

export function CrewPanels(props) {
    const panels = []
    const names = ["alpha", "beta", "gamma", "delta", "epsilon"]
    names.forEach((name, idx) => {
        panels.push(
            <CrewPanel
                key={idx}
                active={idx === props.thisPlayer}
                afterActive={idx === props.thisPlayer + 1}
                name={name}
            />)
    })

    return (
        <div className={classNames("flex-grow grid grid-cols-5 divide-x-4 divide-gray-200 py-4")}>
            {panels}
        </div>
    )
}