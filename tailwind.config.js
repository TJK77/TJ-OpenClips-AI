/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#04060F',
          900: '#070B18',
          850: '#0A0F20',
          800: '#0D1326',
          700: '#141B33',
          600: '#1C2440',
        },
        violet: {
          400: '#9C86FF',
          500: '#7C5CFF',
          600: '#6A45F5',
        },
        cyan: {
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
        },
        muted: '#97A0BE',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Text', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '2.5xl': '22px', '3xl': '26px' },
      boxShadow: {
        glow: '0 18px 50px -18px rgba(124,92,255,0.55)',
        cyan: '0 18px 50px -20px rgba(34,211,238,0.45)',
        panel: '0 24px 60px -30px rgba(0,0,0,0.9)',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'none' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pulseRing: { '0%': { transform: 'scale(.9)', opacity: .7 }, '70%': { transform: 'scale(1.5)', opacity: 0 }, '100%': { opacity: 0 } },
        sweep: { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(320%)' } },
      },
      animation: {
        fadeUp: 'fadeUp .45s cubic-bezier(.2,.7,.3,1) both',
        shimmer: 'shimmer 2.2s linear infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        pulseRing: 'pulseRing 2.4s cubic-bezier(.2,.7,.3,1) infinite',
        sweep: 'sweep 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
