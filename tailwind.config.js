/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#f59e0b',
          soft: '#fde68a',
          deep: '#b45309',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      keyframes: {
        glow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 0 rgba(245,158,11,0))' },
          '50%': { filter: 'drop-shadow(0 0 18px rgba(245,158,11,0.75))' },
        },
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-120px) scale(0.6)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        glow: 'glow 1.2s ease-in-out 3',
        pop: 'pop 400ms ease-out both',
        floatUp: 'floatUp 1.4s ease-out forwards',
        slideUp: 'slideUp 250ms ease-out both',
      },
    },
  },
  plugins: [],
};
