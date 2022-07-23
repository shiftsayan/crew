import { FiCircle, FiSquare, FiX, FiTriangle, FiChevronsUp, FiArrowUpCircle, FiAlertCircle, FiArrowDownCircle, FiHelpCircle } from "react-icons/fi";

import { Communication, Order, Suite } from "./enums";

export const mapNumberToEmoji = {
    0: '0️⃣',
    1: '1️⃣',
    2: '2️⃣',
    3: '3️⃣',
    4: '4️⃣',
    5: '5️⃣',
    6: '6️⃣',
    7: '7️⃣',
    8: '8️⃣',
    9: '9️⃣',
}

export const mapSuiteToIcon = {
    [Suite.Red]: <FiSquare />,
    [Suite.Blue]: <FiCircle />,
    [Suite.Yellow]: <FiX />,
    [Suite.Green]: <FiTriangle />,
    [Suite.Black]: <FiChevronsUp />,
}

export const mapOrderToIcon = {
    [Order.One]: "1",
    [Order.Two]: "2",
    [Order.Three]: "3",
    [Order.Four]: "4",
    [Order.First]: "-",
    [Order.Second]: "=",
    [Order.Third]: "≡",
    [Order.Last]: "Ω",
    [Order.LastTrick]: "Ω",
}

export const mapSuiteToBackgroundColor = {
    [Suite.Red]: 'bg-red-600',
    [Suite.Blue]: 'bg-blue-500',
    [Suite.Yellow]: 'bg-amber-400',
    [Suite.Green]: 'bg-emerald-500',
    [Suite.Black]: 'bg-black',
}

export const mapSuiteToTextColor = {
    [Suite.Red]: 'text-red-600',
    [Suite.Blue]: 'text-blue-500',
    [Suite.Yellow]: 'text-amber-400',
    [Suite.Green]: 'text-emerald-500',
    [Suite.Black]: 'text-black',
}

export const mapSuiteToBorderColor = {
    [Suite.Red]: 'border-red-600',
    [Suite.Blue]: 'border-blue-500',
    [Suite.Yellow]: 'border-amber-400',
    [Suite.Green]: 'border-emerald-500',
    [Suite.Black]: 'border-black',
}

export const mapPlayersToGridsClass = {
    4: "grid-cols-4",
    5: "grid-cols-5",
}

export const mapPlayersToViewSpacing = {
    4: 2,
    5: 4,
}

export const mapMissionVersionToEmoji = {
    'planet_x': "🌕",
    'deep_sea': "🌊",
}

export const mapMissionVersionToName = {
    'planet_x': "🌕 Planet X",
    'deep_sea': "🌊 Deep Sea",
}

export const mapCommunicationToIcon = {
    [Communication.NotCommunicated]: <FiHelpCircle />,
    [Communication.DeadSpot]: <FiHelpCircle />,
    [Communication.Lowest]: < FiArrowDownCircle />,
    [Communication.Only]: <FiAlertCircle />,
    [Communication.Highest]: <FiArrowUpCircle />,
}
