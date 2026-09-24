/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cricket: {
          green: '#10B981',
          pitch: '#D97706',
          ball: '#EF4444',
          night: '#0B0F17',
          panel: '#111827',
          card: '#1F2937',
          border: '#374151',
          accent: '#38BDF8',
          gold: '#F59E0B',
          neon: '#06B6D4'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}

