/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
    },
    extend: {
      transitionDuration: {
        120: '120ms',
        180: '180ms',
      },
      keyframes: {
        slideFade: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-fade-fast': 'slideFade 120ms ease-out both',
        'slide-fade': 'slideFade 180ms ease-out both',
      },
    },
  },
  plugins: [],
};
