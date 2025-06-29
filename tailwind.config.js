/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#00FFFF',
          accent: '#00BFFF',
          dark: '#0F172A',
          'dark-card': '#1E293B',
          'dark-border': 'rgba(0, 255, 255, 0.2)',
          'dark-hover': '#334155'
        },
        trading: {
          profit: '#10B981',
          loss: '#EF4444',
          neutral: '#6B7280',
          buy: {
            light: '#DCFCE7',
            DEFAULT: '#10B981',
            dark: '#065F46'
          },
          sell: {
            light: '#FEE2E2',
            DEFAULT: '#EF4444',
            dark: '#991B1B'
          }
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
        // Override/add marquee animation settings.
        marquee: 'marquee 20s linear infinite',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        // Add the marquee keyframes.
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 255, 255, 0.2)',
        'glow-lg': '0 0 30px rgba(0, 255, 255, 0.3)'
      }
    },
  },
  plugins: [],
};
