import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        'rrr-dash': 'rrr-dash 0.75s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'modal-backdrop-in': 'modal-backdrop-in 0.2s ease-out forwards',
        'modal-panel-in': 'modal-panel-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'expand-item-in': 'expand-item-in 0.3s ease-out both',
      },
      keyframes: {
        'rrr-dash': {
          '0%, 100%': { transform: 'translateX(0) scale(1)' },
          '50%': { transform: 'translateX(10%) scale(1.03)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'modal-backdrop-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'modal-panel-in': {
          from: { opacity: '0', transform: 'translateY(20px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'expand-item-in': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        "elevated-muted": "rgb(var(--elevated-muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-subtle": "rgb(var(--border-subtle) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
          muted: "rgb(var(--accent-muted) / <alpha-value>)",
          subtle: "rgb(var(--accent-subtle) / <alpha-value>)",
        },
        ring: "rgb(var(--ring) / <alpha-value>)",
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          muted: "rgb(var(--success-muted) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          muted: "rgb(var(--danger-muted) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          muted: "rgb(var(--warning-muted) / <alpha-value>)",
        },
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgb(15 23 42 / 0.04), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
        card: "0 4px 24px -4px rgb(15 23 42 / 0.08), 0 2px 8px -2px rgb(15 23 42 / 0.04)",
        modal: "0 24px 48px -12px rgb(15 23 42 / 0.18), 0 8px 16px -8px rgb(15 23 42 / 0.08)",
        glow: "0 4px 14px -2px rgb(109 40 217 / 0.35)",
        nav: "0 1px 0 0 rgb(255 255 255 / 0.8) inset",
        "inner-soft": "inset 0 1px 2px 0 rgb(15 23 42 / 0.04)",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
