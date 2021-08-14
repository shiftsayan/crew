import classNames from 'classnames'

import { CrewEmoji } from "./Emoji"

const mapNumberToEmoji = {
    '1': '1️⃣',
    '2': '2️⃣',
    '3': '3️⃣',
    '4': '4️⃣',
    '5': '5️⃣',
    '6': '6️⃣',
    '7': '7️⃣',
    '8': '8️⃣',
    '9': '9️⃣',
}

const mapSuiteToEmoji = {
    'red': '🔥',
    'blue': '🌊',
    'yellow': '☀️',
    'green': '🌴',
    'black': '🚀',
}

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
            <div className="flex-grow flex">
                <CrewEmoji emoji={mapNumberToEmoji[props.num]} pi={props.pi} />
            </div>
            <div className="flex-grow flex">
                <CrewEmoji emoji={mapSuiteToEmoji[props.suite]} pi={props.pi} />
            </div>
        </>
    )
}

export function CrewCard(props) {
    return (
        <div className={classNames({
            "rounded-xl flex flex-col py-2": true,
            "h-24 w-16": props.pi % 2 === 0,
            "h-16 w-24": props.pi % 2 === 1,
            "transform scale-125": props.selected, // TODO
            "bg-red-100": !props.faceDown && props.suite === 'red',
            "bg-blue-100": !props.faceDown && props.suite === 'blue',
            "bg-green-100": !props.faceDown && props.suite === 'green',
            "bg-yellow-100": !props.faceDown && props.suite === 'yellow',
            "bg-black": !props.faceDown && props.suite === 'black',
            "bg-white": props.faceDown,
        })}>
            {props.faceDown ? <CrewCardBack pi={props.pi} /> : <CrewCardFront num={props.num} suite={props.suite} pi={props.pi} />}
        </div>
    )
}