/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F2F6FF',
          100: '#E6EEFF',
          200: '#CBD9FF',
          300: '#A6BFFF',
          400: '#7A9CF7',
          500: '#4F76DA',
          600: '#2F56B8',
          700: '#1E3F91',
          800: '#163274',
          900: '#122A5E',
          950: '#0C1B3D',
        },
        accent: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          500: '#C77A2E',
          600: '#A85F14',
          700: '#8A4C0E',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#5B6B82',
          soft: '#8A98AE',
        },
        line: '#E6ECF5',
        canvas: '#F7FAFF',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.875rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        soft: '0 2px 10px rgba(18, 42, 94, 0.05)',
        card: '0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 24px rgba(18, 42, 94, 0.05)',
        lift: '0 18px 45px rgba(18, 42, 94, 0.12)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.65s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 7s ease-in-out infinite',
        'toast-in': 'toast-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(rgba(18, 42, 94, 0.10) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
