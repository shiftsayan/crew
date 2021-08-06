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

export function CrewCard(props) {
    const {num, suite} = props

    return (
        <div className="h-28 w-20 bg-red-100 rounded-xl">
            <div>
                <span role="img" aria-label={num}>{mapNumberToEmoji[num]}</span>
            </div>
            <div>
                <p>{mapSuiteToEmoji[suite]}</p>
            </div>
        </div>
    )
}