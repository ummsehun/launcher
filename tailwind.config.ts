import type { Config } from 'tailwindcss';

const launcherColors = {
  bg: 'var(--color-launcher-bg)',
  surface: 'var(--color-launcher-surface)',
  surfaceElevated: 'var(--color-launcher-surface-elevated)',
  panel: 'var(--color-launcher-panel)',
  panelElevated: 'var(--color-launcher-panel-elevated)',
  control: 'var(--color-launcher-control)',
  controlHover: 'var(--color-launcher-control-hover)',
  iconSurface: 'var(--color-launcher-icon-surface)',
  divider: 'var(--color-launcher-divider)',
  overlay: 'var(--color-launcher-overlay)',
  border: 'var(--color-launcher-border)',
  muted: 'var(--color-launcher-muted)',
  text: 'var(--color-launcher-text)',
  textMuted: 'var(--color-launcher-text-muted)',
  primary: 'var(--color-launcher-primary)',
  primaryHover: 'var(--color-launcher-primary-hover)',
  accent: 'var(--color-launcher-accent)',
  accentHover: 'var(--color-launcher-accent-hover)',
  cta: 'var(--color-launcher-cta)',
  ctaHover: 'var(--color-launcher-cta-hover)',
  ctaText: 'var(--color-launcher-cta-text)',
  success: 'var(--color-launcher-success)',
  warning: 'var(--color-launcher-warning)',
  danger: 'var(--color-launcher-danger)',
  terminal: 'var(--color-launcher-terminal)',
} as const;

const launcherShadows = {
  launcher: 'var(--shadow-launcher)',
  panel: 'var(--shadow-panel)',
  glow: 'var(--shadow-glow)',
} as const;

export default {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        launcher: launcherColors,
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      spacing: {
        shell: '1.5rem',
        sidebar: '18rem',
        topbar: '4rem',
      },
      borderRadius: {
        launcher: '1.25rem',
        panel: '1rem',
        control: '0.75rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        ...launcherShadows,
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
