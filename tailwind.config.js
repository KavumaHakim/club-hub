import lineClamp from '@tailwindcss/line-clamp';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.{js,ts,jsx,tsx}',
    './index.{js,ts,jsx,tsx}',
    './DataContext.{js,ts,jsx,tsx}',
    './constants.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        gray: {
          750: '#2d3748',
          850: '#1a202c',
          950: '#0d1117',
        },
        // Modernist "Split" tokens — defined in styles.css, light on
        // :root and dark on .dark, so these need no dark: variants.
        ch: {
          bg: 'var(--ch-bg)',
          surface: 'var(--ch-surface)',
          'surface-2': 'var(--ch-surface-2)',
          text: 'var(--ch-text)',
          muted: 'var(--ch-muted)',
          divider: 'var(--ch-divider)',
          rule: 'var(--ch-rule)',
          accent: 'var(--ch-accent)',
          'accent-deep': 'var(--ch-accent-deep)',
          'accent-soft': 'var(--ch-accent-soft)',
          violet: 'var(--ch-violet)',
          'on-accent': 'var(--ch-on-accent)',
        },
      },
      screens: {
        'xs': '475px',
      }
    },
  },
  plugins: [lineClamp],
};
