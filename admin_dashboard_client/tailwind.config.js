// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,cjs}", // Scan all JS/TS/JSX/TSX files in src
  ],
  theme: {
    extend: {}, // You can customize theme here
  },
  plugins: [],
};
