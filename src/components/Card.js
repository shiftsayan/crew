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

function CrewCardBack() {
    return (
        <div className="flex-grow flex justify-center">
            <CrewEmoji emoji="🧑‍🚀" />
        </div>
    )
}

function CrewCardFront(num, suite) {
    return (
        <>
            <div className="flex-grow flex">
                <CrewEmoji emoji={mapNumberToEmoji[num]} />
            </div>
            <div className="flex-grow flex">
                <CrewEmoji emoji={mapSuiteToEmoji[suite]} />
            </div>
        </>
    )
}

export function CrewCard(props) {
    const {num, suite, faceDown, float} = props
    const classes = classNames({
        "h-28 w-20 rounded-xl flex flex-col border-2 py-3 select-none bg-white": true,
        "mx-2": !float,
    })
    const styles = {
        transform: "translate(-2.5rem, -3.5rem)"
    }

    return (
        <div className={classes} style={float ? styles : {}}>
            {faceDown ? CrewCardBack() : CrewCardFront(num, suite)}
        </div>
    )
}