import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          dim: '#fafafa',
          muted: '#f5f5f5',
          hover: '#eeeeee',
        },
        primary: {
          DEFAULT: '#212121',
          secondary: '#616161',
          tertiary: '#9e9e9e',
          quaternary: '#bdbdbd',
        },
        accent: {
          DEFAULT: '#ff9100',
          hover: '#ff8120',
          active: '#e68200',
          light: '#ffa540',
          lighter: '#ffe0b2',
          50: '#fff3e0',
          100: '#ffe0b2',
          200: '#ffcc80',
        },
        border: {
          DEFAULT: '#e0e0e0',
          secondary: '#f5f5f5',
          accent: '#ffe0b2',
        },
        emerald: {
          50: '#e8f5e9',
          DEFAULT: '#43a047',
          dark: '#388e3c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        'modal': '0 24px 60px rgba(0,0,0,0.16), 0 12px 24px rgba(0,0,0,0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 0.6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
