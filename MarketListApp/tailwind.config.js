/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    darkMode: 'class',
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                // Primary accent color (green)
                primary: {
                    DEFAULT: '#4ADE80',
                    dark: '#22C55E',
                },
                // Dark mode colors
                dark: {
                    bg: '#121212',
                    card: '#1E1E1E',
                    border: '#2A2A2A',
                    text: '#FFFFFF',
                    'text-secondary': '#9CA3AF',
                    'text-muted': '#6B7280',
                },
                // Light mode colors
                light: {
                    bg: '#F5F5F5',
                    card: '#FFFFFF',
                    border: '#E5E5E5',
                    text: '#1A1A1A',
                    'text-secondary': '#6B7280',
                    'text-muted': '#9CA3AF',
                },
            },
            fontFamily: {
                sans: ['System', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
