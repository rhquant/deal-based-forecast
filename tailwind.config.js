/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        coconut: '#FFFFFF',
        licorice: '#11110D',
        matcha: {
          DEFAULT: '#D1F470',
          '000': '#E6FAAB',
          100: '#D1F470',
          200: '#B2DA56',
          300: '#92BF3B',
          400: '#70A32A',
          500: '#4E8336',
          600: '#355E34',
        },
        sesame: {
          DEFAULT: '#F5F5F2',
          100: '#F5F5F2',
          200: '#E5E5E2',
          300: '#D5D5D2',
          400: '#B4B4B0',
          500: '#90918C',
          600: '#6C6C68',
          700: '#42433E',
        },
        cactus: '#A1D78F',
        pineapple: '#FEEB7E',
        shamrock: '#2D4C33',
        fern: '#203524',
      },
    },
  },
  plugins: [],
}
