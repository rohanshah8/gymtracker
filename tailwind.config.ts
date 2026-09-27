import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Matches the palette already established in ShareCard.tsx so the
        // share-card visuals and the rest of the app feel like one product.
        brand: {
          DEFAULT: '#f97316', // orange-500
          dark: '#c2410c',
        },
        surface: {
          DEFAULT: '#171717', // neutral-900
          raised: '#262626', // neutral-800
          border: '#404040', // neutral-700
        },
      },
      borderRadius: {
        card: '1.5rem',
      },
      spacing: {
        'thumb-zone': '5.5rem', // reserved bottom-nav / primary-action height on mobile
      },
    },
  },
  plugins: [],
};

export default config;
