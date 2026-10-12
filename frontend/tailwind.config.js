/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        accent: '#ec4899',
        'bg-base': '#0f0f13',
        'bg-surface': '#18181f',
        'bg-card': '#1e1e28',
        'text-primary': '#f1f1f5',
        'text-muted': '#8b8ba0',
        'score-vector': '#818cf8',
        'score-bm25': '#f472b6',
        'score-hybrid': '#34d399',
      },
      keyframes: {
        pulse: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        shimmer: { '0%': { backgroundPosition: '-200%' }, '100%': { backgroundPosition: '200%' } },
      },
      animation: {
        'status-pulse': 'pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};