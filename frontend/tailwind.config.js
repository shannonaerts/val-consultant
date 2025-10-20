/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#dcfce7',
          500: '#134366',
          600: '#134366',
          700: '#0e334f',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#408272',
          600: '#2f6f61',
          700: '#234e42',
        },
        orange: {
          50: '#fff7ed',
          100: '#fed7aa',
          500: '#ed9a4d',
          600: '#dd7a37',
          700: '#c15e1f',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}