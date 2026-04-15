/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"DM Sans"', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#edfcf5',
          100: '#d3f8e8',
          200: '#aaf0d4',
          300: '#73e3b9',
          400: '#3dcfa0',
          500: '#17b584',
          600: '#0e9169',
          700: '#0d7357',
          800: '#0e5c46',
          900: '#0d4c3b',
        },
        surface: {
          DEFAULT: '#0f1117',
          card:    '#161b25',
          border:  '#1e2736',
          hover:   '#1a2133',
        }
      },
    },
  },
  plugins: [],
}
