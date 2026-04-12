/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', 'html[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--color-page)',
        fg: 'var(--color-fg)',
        'fg-muted': 'var(--color-fg-muted)',
        'fg-subtle': 'var(--color-fg-subtle)',
        'fg-inverse': 'var(--color-fg-inverse)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'surface-muted': 'var(--color-surface-muted)',
        'surface-input': 'var(--color-surface-input)',
        'surface-tint': 'var(--color-surface-tint)',
        'surface-tint-strong': 'var(--color-surface-tint-strong)',
        'surface-faint': 'var(--color-surface-faint)',
        panel: 'var(--color-panel)',
        border: 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',
        'border-strong': 'var(--color-border-strong)',
        'border-input': 'var(--color-border-input)',
        ring: 'var(--color-ring)',
        'ring-strong': 'var(--color-ring-strong)',
        overlay: 'var(--color-overlay)',
        'overlay-heavy': 'var(--color-overlay-heavy)',
        accent: 'var(--color-accent)',
        'accent-fg': 'var(--color-accent-fg)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        card: 'var(--shadow-card)',
      },
      ringOffsetColor: {
        page: 'var(--color-page)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Space Grotesk"', 'sans-serif'],
      },
      backgroundImage: {
        grid:
          'linear-gradient(var(--color-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-grid-line) 1px, transparent 1px)',
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
