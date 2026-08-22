/** @type {import('tailwindcss').Config} */
export default {
  content: ['./studio/**/*.{html,tsx}', './src/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F1EB',
        'paper-raised': '#FDFBF7',
        ink: '#0A0A0A',
        // 6.78:1 on paper — passes AA for body text.
        muted: '#57534E',
        // 4.26:1 — large/UI text only.
        faint: '#78716C',
        rule: '#DDD6CC',
        // Signal is 2.35:1 on paper: fills and rules only, never text.
        signal: '#F48022',
        'signal-deep': '#B45309',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Red Hat Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
