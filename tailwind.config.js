/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'berkeley-blue': '#003262',
        'california-gold': '#FDB515',
        'berkeley-blue-light': '#3B7EA1',
        'berkeley-blue-dark': '#00213E',
        'gold-light': '#FFD700',
        'gold-dark': '#E5A400',
      },
    },
  },
  plugins: [],
}
