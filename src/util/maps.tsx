import { FiCircle, FiSquare, FiX, FiTriangle, FiChevronsUp, FiArrowUpCircle, FiAlertCircle, FiArrowDownCircle, FiHelpCircle } from "react-icons/fi";

import { Communication, Move } from "./enums";
import { advancePhase, toggleGoal } from "./state";

export const mapNumberToEmoji = {
    '0': '0️⃣',
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

export const mapSuiteToIcon = {
    'red': <FiSquare />,
    'blue': <FiCircle />,
    'yellow': <FiX />,
    'green': <FiTriangle />,
    'black': <FiChevronsUp />,
}

export const mapOrderToIcon = {
    'one': "1",
    'two': "2",
    'three': "3",
    'four': "4",
    'first': "-",
    'second': "=",
    'third': "≡",
    'last': "Ω",
}

export const mapSuiteToBackgroundColor = {
    'red': 'bg-red-600',
    'blue': 'bg-blue-500',
    'yellow': 'bg-amber-400',
    'green': 'bg-emerald-500',
    'black': 'bg-black',
}

export const mapSuiteToTextColor = {
    'red': 'text-red-600',
    'blue': 'text-blue-500',
    'yellow': 'text-amber-400',
    'green': 'text-emerald-500',
    'black': 'text-black',
}

export const mapSuiteToBorderColor = {
    'red': 'border-red-600',
    'blue': 'border-blue-500',
    'yellow': 'border-amber-400',
    'green': 'border-emerald-500',
    'black': 'border-black',
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

export const mapCommunicationToIcon = {
    [Communication.NotCommunicated]: <FiHelpCircle />,
    [Communication.DeadSpot]: <FiHelpCircle />,
    [Communication.Lowest]: < FiArrowDownCircle />,
    [Communication.Only]: <FiAlertCircle />,
    [Communication.Highest]: <FiArrowUpCircle />,
}