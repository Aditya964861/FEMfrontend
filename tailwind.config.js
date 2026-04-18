/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5fce6',
          100: '#eaf9c4',
          200: '#ddf59e',
          300: '#D3F263',
          400: '#c2e44a',
          500: '#9cc509',
          600: '#8ab308',
          700: '#6f9006',
          800: '#576f05',
          900: '#3d4f03',
          950: '#2a3702',
        },
        brand: {
          lime: '#D3F263',
          green: '#9cc509',
          dark: '#0f1420',
          navy: '#161b2e',
          panel: '#1c2237',
          border: '#2a3150',
        },
      },
    },
  },
  plugins: [],
};
