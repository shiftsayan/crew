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
            <span role="img" className="text-3xl m-auto">
                🧑‍🚀
            </span>
        </div>
    )
}

function CrewCardFront(num, suite) {
    return (
        <>
            <div className="flex-grow flex">
                <span role="img" aria-label={num} className="text-3xl m-auto">
                    {mapNumberToEmoji[num]}
                </span>
            </div>
            <div className="flex-grow flex">
                <span role="img" aria-label={suite} className="text-3xl m-auto">
                    {mapSuiteToEmoji[suite]}
                </span>
            </div>
        </>
    )
}

export function CrewCard(props) {
    const {num, suite, faceDown} = props

    return (
        <div className="h-28 w-20 rounded-xl flex flex-col border-2 py-3 mx-2 select-none">
            {faceDown ? CrewCardBack() : CrewCardFront(num, suite)}
        </div>
    )
}