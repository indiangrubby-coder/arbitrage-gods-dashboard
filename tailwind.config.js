/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Moss color palette
        moss: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
          700: '#4d7c0f',
          800: '#365314',
          900: '#1a2e05',
        },
        // Primary moss colors
        primary: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
          700: '#4d7c0f',
          800: '#365314',
          900: '#1a2e05',
        },
        // Secondary moss colors
        secondary: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#facc15',
          400: '#eab308',
          500: '#ca8a04',
          600: '#a16207',
          700: '#854d0e',
          800: '#713f12',
          900: '#422006',
        },
        // Accent colors
        accent: {
          50: '#fef7ff',
          100: '#fce7ff',
          200: '#f8d4fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#581c87',
        },
        // Semantic colors with moss theme
        success: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#84cc16',
          500: '#65a30d',
          600: '#4d7c0f',
          700: '#365314',
          800: '#1a2e05',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Text colors
        text: {
          primary: '#365314',
          secondary: '#4d7c0f',
          tertiary: '#65a30d',
          muted: '#6b7280',
          inverse: '#ffffff',
        },
        // Background colors
        background: {
          primary: '#f7fee7',
          secondary: '#fefce8',
          tertiary: '#ffffff',
          inverse: '#365314',
        },
        // Surface colors
        surface: {
          primary: '#ffffff',
          secondary: '#fefce8',
          tertiary: '#f7fee7',
          elevated: '#ffffff',
          inverse: '#365314',
        },
        // Border colors
        border: {
          primary: '#d9f99d',
          secondary: '#bef264',
          tertiary: '#84cc16',
          muted: '#e5e7eb',
          inverse: '#365314',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'base': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '500' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
      },
      fontWeight: {
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-light': 'bounce 1s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'bento': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'bento-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'bento-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'bento': '0.75rem',
        'bento-lg': '1rem',
        'bento-xl': '1.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        'bento': '1rem',
        'bento-lg': '1.5rem',
        'bento-xl': '2rem',
      },
      gridTemplateColumns: {
        'bento': 'repeat(auto-fit, minmax(280px, 1fr))',
        'bento-sm': 'repeat(auto-fit, minmax(200px, 1fr))',
        'bento-lg': 'repeat(auto-fit, minmax(320px, 1fr))',
        'bento-xl': 'repeat(auto-fit, minmax(400px, 1fr))',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}