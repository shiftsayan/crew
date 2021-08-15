import classNames from "classnames"
import { mapSuiteToEmoji, mapNumberToEmoji } from "../util/emojis"

import { CrewEmoji } from "./Emoji"

export function CrewGoal(props) {
    return (
        <div className="h-12 w-28 bg-white rounded-lg flex justify-between overflow-hidden">
            <div className={classNames("w-10 m-auto h-full", props.color.bg.default)}>

            </div>
            <div className="flex-grow flex m-auto justify-evenly">
                <CrewEmoji emoji={mapNumberToEmoji[props.num]} size="text-2xl" />
                <CrewEmoji emoji={mapSuiteToEmoji[props.suite]} size="text-2xl" />
            </div>
        </div>
    )
}