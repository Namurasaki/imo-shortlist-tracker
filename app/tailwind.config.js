/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        algebra: '#ef4444',
        combinatorics: '#f59e0b',
        geometry: '#10b981',
        numbertheory: '#3b82f6',
      }
    },
  },
  plugins: [],
}
