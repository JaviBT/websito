import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg:        '#1c1c1c',
        surface:   '#262626',
        border:    '#3a3a3a',
        muted:     '#666666',
        secondary: '#b0b0b0',
        primary:   '#ffffff',
        accent:    '#7dd3fc',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [typography],
};
