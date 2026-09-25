/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#09090b',
        carbon: '#111114',
        'card-bg': '#151519',
        'card-elevated': '#1a1a20',
        'card-hover': '#202028',
        chalk: '#ffffff',
        'chalk-soft': '#f4f4f5',
        smoke: '#a1a1aa',
        ash: '#71717a',
        graphite: '#27272a',
        iron: '#3f3f46',
        'card-slate': '#52525b',
        'signal-white': '#ffffff',
        'compass-gold': '#eab308',
        'compass-gold-dim': '#ca8a04',
        'pulse-green': '#22c55e',
        'violation-red': '#ef4444',
        'hold-amber': '#f59e0b',
        'amber-warning': '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['40px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'heading-lg': ['28px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        heading: ['20px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'heading-sm': ['16px', { lineHeight: '1.3' }],
        body: ['14px', { lineHeight: '1.55' }],
        caption: ['13px', { lineHeight: '1.4' }],
        meta: ['11px', { lineHeight: '1.2' }],
      },
      borderRadius: {
        tags: '4px',
        cards: '8px',
      },
    },
  },
  plugins: [],
};
