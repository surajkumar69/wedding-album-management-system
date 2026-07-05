/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#D4AF37', // Metallic Gold
          light: '#F3E5AB',   // Soft Golden Silk
          dark: '#AA7C11',    // Burnished Gold
          glow: 'rgba(212, 175, 55, 0.15)',
        },
        charcoal: {
          light: '#2E2E2E',
          DEFAULT: '#1A1A1A', // Dark Caviar
          dark: '#0D0D0D',    // True Black Velvet
        },
        luxury: {
          white: '#FAFAFA',
          cream: '#FFFDD0',
          silver: '#E5E5E5'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Outfit"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'gold-sm': '0 2px 8px -1px rgba(212, 175, 55, 0.2)',
        'gold-lg': '0 10px 25px -5px rgba(212, 175, 55, 0.3), 0 8px 10px -6px rgba(212, 175, 55, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
