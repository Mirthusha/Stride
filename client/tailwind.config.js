/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          50: '#f4faf6',
          100: '#e5f6ec',
          200: '#caedda',
          300: '#a1dfbf',
          400: '#6fca9e',
          500: '#46af7f',
          600: '#348e65',
          700: '#2c7152',
          800: '#265a43',
          900: '#214a38',
          950: '#0e291e',
        },
        sage: {
          50: '#f6f7f5',
          100: '#e9ece6',
          200: '#d5dbcf',
          300: '#b7c3ad',
          400: '#95a587',
          500: '#798b6b',
          600: '#5e6e52',
          700: '#4a5641',
          800: '#3d4737',
          900: '#343c30',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(16, 40, 24, 0.05)',
        'card': '0 10px 30px -4px rgba(22, 56, 34, 0.06)',
        'elevated': '0 20px 40px -6px rgba(14, 41, 25, 0.08)',
      },
      borderRadius: {
        'pill': '9999px',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
