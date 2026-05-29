import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg:        '#2c2c2c',
        surface:   '#383838',
        border:    '#4a4a4a',
        muted:     '#888888',
        secondary: '#d4d4d4',
        primary:   '#f5f5f5',
        accent:    '#3b82f6',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [typography],
};
