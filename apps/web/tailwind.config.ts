import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ["var(--font-body)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        // Backwards-compat for any consumers still on `font-heading`.
        heading: ["var(--font-display)"],
      },
      colors: {
        // Editorial palette
        paper: "hsl(var(--paper))",
        "paper-deep": "hsl(var(--paper-deep))",
        surface: "hsl(var(--surface))",
        "surface-soft": "hsl(var(--surface-soft))",
        ink: {
          DEFAULT: "hsl(var(--ink))",
          soft: "hsl(var(--ink-soft))",
          muted: "hsl(var(--ink-muted))",
          faint: "hsl(var(--ink-faint))",
        },
        rule: {
          DEFAULT: "hsl(var(--rule))",
          soft: "hsl(var(--rule-soft))",
          strong: "hsl(var(--rule-strong))",
        },
        teal: {
          DEFAULT: "hsl(var(--teal))",
          soft: "hsl(var(--teal-soft))",
          tint: "hsl(var(--teal-tint))",
        },
        terracotta: "hsl(var(--terracotta))",
        amber: "hsl(var(--amber))",
        forest: {
          DEFAULT: "hsl(var(--forest))",
          soft: "hsl(var(--forest-soft))",
        },

        // Compatibility aliases for older code
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.36, 0.5, 1)",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        ticker: "ticker 60s linear infinite",
      },
    },
  },
  plugins: [],
}

export default config
