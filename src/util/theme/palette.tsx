import { choice } from "../random"


const PALETTES = [
    { background: "from-green-300 via-blue-500 to-purple-600", accent: "primary" },
    // { background: "from-pink-500 via-red-500 to-yellow-500", accent: "error" },
    // { background: "from-green-500 to-green-700", accent: "success" },
    // { background: "from-orange-500 to-yellow-300", accent: "warning" },
    // { background: "from-gray-900 to-gray-600 bg-gradient-to-r", accent: "secondary" },
]

export const palette = choice(PALETTES)