/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./src/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        'noto': ['Noto Sans KR', 'sans-serif'],
      },
      colors: {
        'karrot-orange': '#FF6F0F',
        'karrot-orange-hover': '#E4630D',
      }
    },
  },
  plugins: [],
}