/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#005AAF',
          600: '#0056a3',
          700: '#004d8f',
        },
        secondary: {
          500: '#0078D4',
        },
        accent: {
          500: '#00B8A9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};