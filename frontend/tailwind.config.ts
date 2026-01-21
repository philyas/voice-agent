import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Gold / Amber tones
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d4a853',
          600: '#b8942d',
          700: '#92710a',
          800: '#78590a',
          900: '#5c4308',
          950: '#3d2a05',
        },
        // Dark / Charcoal tones
        dark: {
          50: '#f8f8f8',
          100: '#e8e8e8',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4a4a4a',
          800: '#292929',
          850: '#1f1f1f',
          900: '#171717',
          950: '#0a0a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
          '100%': { transform: 'scale(0.95)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 20px rgba(212, 168, 83, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(212, 168, 83, 0.6)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gold-gradient': 'linear-gradient(135deg, #d4a853 0%, #b8942d 50%, #d4a853 100%)',
        'dark-gradient': 'linear-gradient(180deg, #171717 0%, #0a0a0a 100%)',
      },
      boxShadow: {
        'gold': '0 4px 20px rgba(212, 168, 83, 0.25)',
        'gold-lg': '0 8px 30px rgba(212, 168, 83, 0.35)',
        'dark': '0 4px 20px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
