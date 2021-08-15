import classNames from 'classnames'

import { mapSuiteToEmoji, mapNumberToEmoji } from "../util/emojis"

import { CrewEmoji } from "./Emoji"

function CrewCardBack(props) {
    return (
        <div className="flex-grow flex justify-center">
            <CrewEmoji emoji="🧑‍🚀" pi={props.pi} />
        </div>
    )
}

function CrewCardFront(props) {
    return (
        <>
            <div className="m-auto">
                <CrewEmoji emoji={mapNumberToEmoji[props.num]} pi={props.pi} />
            </div>
            <div className="m-auto">
                <CrewEmoji emoji={mapSuiteToEmoji[props.suite]} pi={props.pi} />
            </div>
        </>
    )
}

export function CrewCard(props) {
    return (
        <div className={classNames({
            "rounded-xl flex flex-col py-4": true,
            "h-28 w-20": true,
            'bg-white': true,
            // "bg-red-100": !props.faceDown && props.suite === 'red',
            // "bg-blue-100": !props.faceDown && props.suite === 'blue',
            // "bg-green-100": !props.faceDown && props.suite === 'green',
            // "bg-yellow-100": !props.faceDown && props.suite === 'yellow',
            // "bg-black": !props.faceDown && props.suite === 'black',
            // "bg-white": props.faceDown,
        })}>
            {props.faceDown ? <CrewCardBack pi={props.pi} /> : <CrewCardFront num={props.num} suite={props.suite} pi={props.pi} />}
        </div>
    )
}