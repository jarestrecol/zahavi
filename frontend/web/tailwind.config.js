/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef3c7',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
        },
      },
    },
  },
  plugins: [],
};
