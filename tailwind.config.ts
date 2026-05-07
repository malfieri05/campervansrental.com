import type { Config } from 'tailwindcss'
import { CALENDAR_FEED_COLOR_SAFELIST } from './lib/calendar-feed-colors'

const config: Config = {
  safelist: CALENDAR_FEED_COLOR_SAFELIST,
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7f4',
          100: '#d9ede5',
          200: '#b3dac9',
          300: '#7dbfa5',
          400: '#4a9e7d',
          500: '#2d8060',
          600: '#1e6349',
          700: '#174d39',
          800: '#103d2d',
          900: '#0a2d21',
          950: '#061a14',
        },
        gold: {
          50: '#fdf9ee',
          100: '#f9efc8',
          200: '#f2da8d',
          300: '#e9c04e',
          400: '#e0a82a',
          500: '#c4861a',
          600: '#a86814',
          700: '#8a4e12',
          800: '#6d3d11',
          900: '#5a3210',
          950: '#321a07',
        },
        cream: {
          50: '#fdfcf9',
          100: '#f8f4ed',
          200: '#f0e8d5',
          300: '#e4d4b5',
          400: '#d3ba8e',
          500: '#bf9e6b',
        },
        earth: {
          500: '#8B6914',
          800: '#3d2e0a',
        },
        charcoal: '#1c1c1c',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      animation: {
        fadeInUp: 'fadeInUp 0.7s ease-out forwards',
        fadeIn: 'fadeIn 0.5s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        luxury: '0 20px 60px -10px rgba(0,0,0,0.3)',
        'luxury-sm': '0 8px 30px -4px rgba(0,0,0,0.2)',
        gold: '0 4px 20px rgba(224, 168, 42, 0.3)',
      },
      transitionDuration: {
        '400': '400ms',
      },
      borderRadius: {
        none: '0',
        sm: '0.5rem',    // was ~2px — now 8px (buttons, cards, badges)
        DEFAULT: '0.75rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}

export default config
