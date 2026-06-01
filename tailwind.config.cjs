/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
    './types/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sora: ['Sora', 'sans-serif'],
      },
      colors: {
        'hero-bg':      'hsl(0 0% 8%)',
        'nav-button':   'hsl(0 0% 18%)',
        'lp-bg':        'hsl(0 0% 10%)',
        'lp-fg':        'hsl(0 0% 96%)',
        'lp-primary':   'hsl(119 99% 46%)',
        'lp-primary-fg':'hsl(0 0% 4%)',
        'lp-muted':     'hsl(0 0% 16%)',
        'lp-muted-fg':  'hsl(0 0% 60%)',
        'lp-border':    'hsl(0 0% 20%)',
        primary: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        brand: {
          50:  '#ecfccb',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        slate: {
          900: '#0f172a',
          950: '#020617',
        },
      },
      animation: {
        'fade-up':       'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in':       'fade-in 0.5s ease-out forwards',
        'mesh':          'mesh 20s ease infinite',
        'float':         'float 5s ease-in-out infinite',
        'pop-in':        'popIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer-fast':  'shimmer 1.5s infinite linear',
        'blob':          'blob 10s infinite alternate ease-in-out',
        'pulse-soft':    'pulseSoft 4s ease-in-out infinite',
        'flow':          'flow 30s linear infinite',
        'draw-check':    'drawCheck 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)',     filter: 'blur(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        mesh: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-15px)' },
        },
        popIn: {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        blob: {
          '0%':   { transform: 'translate(0px, 0px) scale(1)' },
          '33%':  { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%':  { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.8', transform: 'scale(1.05)' },
        },
        flow: {
          '0%':   { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        drawCheck: {
          to: { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [],
};
