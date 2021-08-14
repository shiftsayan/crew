export function getColorPalette(color) {
    return {
        'text': {
            'light': `text-${color}-200`,
            'default': `text-${color}-500`,
            'dark': `text-${color}-700`,
        },
        'bg': {
            'light': `bg-${color}-200`,
            'default': `bg-${color}-500`,
            'dark': `bg-${color}-700`,
        },
    }
}