/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        'brand-primary': '#6366f1', // Indigo 500
        'brand-secondary': '#10b981', // Emerald 500
        'light-bg': '#ffffff',
        'dark-bg': '#09090b', // Zinc 950
        'light-card': '#f8fafc',
        'dark-card': '#18181b', // Zinc 900
        'light-text': '#0f172a', // Slate 900
        'dark-text': '#e4e4e7', // Zinc 200
        'light-text-secondary': '#475569', // Slate 600
        'dark-text-secondary': '#a1a1aa', // Zinc 400
      },
    },
  },
  plugins: [],
};
