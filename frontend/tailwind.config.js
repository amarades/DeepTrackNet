/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fd',
          300: '#a5bcfb',
          400: '#8097f8',
          500: '#6272f1',
          600: '#4f53e4',
          700: '#4041ca',
          800: '#3535a4',
          900: '#2f3082',
        },
        surface: {
          900: '#0a0b1a',
          800: '#0f1128',
          700: '#151730',
          600: '#1c1f3d',
          500: '#242847',
          400: '#2d3258',
        },
        risk: {
          low:      '#22c55e',
          medium:   '#eab308',
          high:     '#f97316',
          critical: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':   'slideIn 0.3s ease-out',
        'fade-in':    'fadeIn 0.4s ease-out',
        'glow':       'glow 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to:   { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(98, 114, 241, 0.3)' },
          '50%':      { boxShadow: '0 0 20px rgba(98, 114, 241, 0.7)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
