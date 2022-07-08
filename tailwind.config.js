module.exports = {
    mode: 'jit',
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                'display': ['Poppins'],
            },
            strokeWidth: {
                'icon': '3px',
            },
            gridTemplateColumns: {
                '14': 'repeat(14, minmax(0, 1fr))',
            },
            scale: {
                '80': '0.8',
            },
            animation: {
                gradient: 'gradient 150s ease infinite',
            },
            keyframes: {
                'gradient': {
                    '0%': { 'background-position': '0%' },
                    '50%': { 'background-position': '100%' },
                    '100%': { 'background-position': '0%' },
                }
            }
        },
    },
    plugins: [],
};
