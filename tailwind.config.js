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
            }
        },
    },
    plugins: [],
};
