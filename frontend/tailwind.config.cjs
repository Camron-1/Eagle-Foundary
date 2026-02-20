/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        border: 'var(--border)',
      },
      boxShadow: {
        glow: '0 0 120px rgba(255,255,255,0.12)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Space Grotesk"', 'sans-serif'],
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
      },
      animation: {
        'float-slow': 'float-slow 9s ease-in-out infinite',
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotateX(25deg) rotateY(-34deg)' },
          '50%': { transform: 'translateY(-20px) rotateX(20deg) rotateY(-26deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
