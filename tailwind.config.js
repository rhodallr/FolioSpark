/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      colors: {
        ink: { DEFAULT: '#1A1714', soft: '#3A342E', muted: '#6B635A' },
        paper: { DEFAULT: '#FBF8F3', deep: '#F3EDE3', line: '#E7E0D6' },
        spark: { DEFAULT: '#E8590C', light: '#FFE8D9', dark: '#B8440A' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(26,23,20,0.04), 0 8px 24px -8px rgba(26,23,20,0.12)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        blink: { '0%, 80%, 100%': { opacity: 0.2 }, '40%': { opacity: 1 } },
      },
      animation: {
        rise: 'rise .35s ease-out both',
        blink: 'blink 1.2s infinite both',
      },
    },
  },
  plugins: [],
};
