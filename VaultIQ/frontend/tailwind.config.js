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
        brand: {
          bg: '#0a0d14',
          card: 'rgba(17, 22, 34, 0.65)',
          border: 'rgba(255, 255, 255, 0.08)',
          highlight: '#38bdf8',
          accent: '#c084fc',
          textMuted: '#9ca3af',
          textActive: '#f3f4f6',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
