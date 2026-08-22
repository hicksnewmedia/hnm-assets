/** @type {import('tailwindcss').Config} */
export default {
  content: ['./studio/**/*.{html,tsx}', './src/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F1EB', ink: '#0A0A0A',
        signal: '#F48022', 'signal-deep': '#D96A14', ocean: '#20557B',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['Geist', 'sans-serif'],
        mono: ['"Red Hat Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
