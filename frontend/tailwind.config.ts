import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      },
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        elevated: "rgb(var(--color-surface-elevated) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)"
      },
      borderRadius: {
        panel: "var(--radius-panel)",
        control: "var(--radius-control)"
      },
      boxShadow: {
        panel: "var(--shadow-panel)"
      }
    }
  },
  plugins: []
} satisfies Config;
