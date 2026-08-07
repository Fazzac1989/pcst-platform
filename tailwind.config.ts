import type { Config } from 'tailwindcss';

// Brand tokens only — default Tailwind colors are intentionally not exposed.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      ink: '#16242E',
      'ink-soft': '#425964',
      teal: '#19BAAB',
      'teal-deep': '#12897E',
      'teal-hover': '#14A396',
      line: 'rgba(22,36,46,.14)',
      danger: '#B4423C',
    },
    fontFamily: {
      sans: ['var(--font-archivo)', 'sans-serif'],
      serif: ['var(--font-fraunces)', 'serif'],
    },
    extend: {
      maxWidth: { site: '1240px' },
    },
  },
  plugins: [],
};

export default config;
