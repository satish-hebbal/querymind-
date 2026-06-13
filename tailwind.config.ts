import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg-base) / <alpha-value>)",
        surface: "rgb(var(--bg-surface) / <alpha-value>)",
        card: "rgb(var(--bg-card) / <alpha-value>)",
        elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-bright": "rgb(var(--border-bright) / <alpha-value>)",
        accent: "rgb(var(--accent-green) / <alpha-value>)",
        "accent-glow": "rgb(var(--accent-glow) / <alpha-value>)",
        "accent-dim": "rgb(var(--accent-dim) / <alpha-value>)",
        "accent-muted": "rgb(var(--accent-muted) / <alpha-value>)",
        ink: "rgb(var(--text-primary) / <alpha-value>)",
        "ink-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        "ink-tertiary": "rgb(var(--text-tertiary) / <alpha-value>)",
        "ink-dim": "rgb(var(--text-dim) / <alpha-value>)",
        success: "#22c55e",
        error: "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      boxShadow: {
        "glow-sm": "0 0 12px rgba(120, 113, 108, 0.15)",
        "glow-md": "0 0 24px rgba(120, 113, 108, 0.2)",
        "glow-lg": "0 0 48px rgba(120, 113, 108, 0.12)",
      },
      borderRadius: {
        xl: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
