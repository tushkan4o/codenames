/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        board: {
          bg: '#121218',
          card: '#8a8a78',
          red: '#EF5350',
          blue: '#42A5F5',
          neutral: '#b0b0b0',
          assassin: '#3a3a3a',
        }
      },
      fontFamily: {
        game: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        card: ['"PT Sans Narrow"', 'Arial Narrow', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
