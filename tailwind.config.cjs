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
      fontSize: {
        // The typography floor. 765 text nodes were set below 11px with
        // arbitrary values — text-[10px] down to text-[7px] — which is below
        // what is comfortably readable on a phone, and arbitrary values mean
        // the floor cannot be enforced or moved in one place.
        //
        // `2xs` is that one place: 11px, the smallest size any text meant to be
        // READ may use. Tailwind's own scale starts at text-xs (12px), so this
        // sits one step below it rather than forcing every caption up 20%.
        //
        // Not covered by this: the numerals inside fixed-size count badges
        // (a `1` in a 14px dot). Those are glyphs in a shape, not text to read,
        // and raising them overflows the dot. They keep their arbitrary value
        // until the portal passes give them a primitive of their own.
        '2xs': ['0.6875rem', { lineHeight: '1.45' }],
      // The one sanctioned exception to the 11px floor: a numeral inside a
      // fixed-size count badge (a `1` inside a 14px dot). It is a glyph in a
      // shape, not text to read, and 11px overflows the dot. v2.6.13 recorded
      // these as needing a primitive rather than an exemption comment — this
      // is that primitive, so the size lives in one place like every other.
      'badge': ['0.55rem', { lineHeight: '1' }],
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sora: ['Sora', 'sans-serif'],
      },
      // `text-ds-green` resolves to the darkened text token while every other
      // ds-green utility (bg-, border-, ring-, from-) keeps the fill colour.
      // Tailwind merges this over `colors` for the text-* utilities only.
      textColor: {
        'ds-green': 'var(--ds-green-text)',
        'ds-amber': 'var(--ds-amber-text)',
        // For green text on an always-dark surface, which never flips theme.
        'ds-green-on-dark': 'var(--ds-green-on-dark)',
        // Label sitting ON a primary-green fill.
        'ds-on-green': 'var(--ds-on-green)',
        // Amber text on an always-dark surface, same reason as ds-green-on-dark.
        'ds-amber-on-dark': 'var(--ds-amber-on-dark)',
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
        'sp-emerald': {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
        },
        'sp-blue': {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a8a',
        },
        'sp-amber': {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        'sp-orange': {
          50:  '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          900: '#7C2D12',
        },
        slate: {
          900: '#0f172a',
          950: '#020617',
        },
        // ── SurePath Design System v2 ─────────────────────────────────────────
        // Colors use CSS variables — dark mode switches automatically via .dark class
        // Backgrounds
        'ds-bg':         'var(--ds-bg)',
        'ds-card':       'var(--ds-card)',
        'ds-card2':      'var(--ds-card2)',
        'ds-border':     'var(--ds-border)',
        // Primary — vibrant emerald (same in light/dark)
        // NOTE: `text-ds-green` does NOT resolve to this; see textColor below.
        'ds-green':      'var(--ds-green)',
        'ds-green-dk':   'var(--ds-green-dk)',
        'ds-green-tint': 'var(--ds-green-tint)',
        // Dark surfaces (hero sections — always dark in both modes)
        'ds-navy':       '#0B1120',
        'ds-navy2':      '#162032',
        'ds-navy3':      '#1E2D3D',
        // Text
        'ds-ink':        'var(--ds-ink)',
        'ds-ink2':       'var(--ds-ink2)',
        'ds-ink3':       'var(--ds-ink3)',
        // Semantic
        'ds-blue':       'var(--ds-blue)',
        'ds-amber':      'var(--ds-amber)',
        'ds-red':        'var(--ds-red)',
        'ds-purple':     'var(--ds-purple)',
        'ds-purple-lt':  'var(--ds-purple-lt)',
        'ds-whatsapp':   'var(--ds-whatsapp)',
        // Semantic tints — mode-aware, so status chips stay legible in dark mode
        'ds-blue-lt':    'var(--ds-info-tint)',
        'ds-amber-lt':   'var(--ds-warning-tint)',
        'ds-red-lt':     'var(--ds-danger-tint)',
        // SurePath brand — always-on values (not mode-switched)
        'sp-green':      '#00C16A',
        'sp-emerald':    '#003B2F',
        'sp-graphite':   '#1A1A1A',
        // Dark mode explicit aliases (for opacity-modifier usage in header/nav)
        'ds-dk-bg':      '#080B12',
        'ds-dk-s1':      '#0F1829',
        'ds-dk-s2':      '#162035',
        'ds-dk-bd':      '#1E2D3D',
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
      boxShadow: {
        'sp-card':   '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'sp-hero':   '0 8px 32px rgba(16,185,129,0.20)',
        'sp-modal':  '0 25px 50px rgba(0,0,0,0.25)',
        // DS v2 shadows
        'ds-sm':     '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'ds-md':     '0 4px 16px rgba(0,0,0,0.08)',
        'ds-lg':     '0 8px 32px rgba(0,0,0,0.10)',
        'ds-green':  '0 4px 20px rgba(0,193,106,0.30)',
        'ds-navy':   '0 8px 32px rgba(11,17,32,0.30)',
      },
    },
  },
  plugins: [],
};
