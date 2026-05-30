/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1a5c45',
          gold: '#e8c96a',
          cream: '#fef6d0',
          border: '#e8e0d0',
        },
      },
    },
  },
  plugins: [],
}
