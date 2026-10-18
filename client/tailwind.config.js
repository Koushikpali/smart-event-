/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14122B',
        blue: { DEFAULT: '#3B34FF', deep: '#2620C9' },
        lilac: '#D9D5FF',
        sun: '#FFB627',
        paper: '#F6F5FB',
        danger: '#D93A3F',
        ok: '#12915A',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
