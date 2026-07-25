import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          sunken: "var(--surface-sunken)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          subtle: "var(--ink-subtle)",
          inverse: "var(--ink-inverse)",
        },
        line: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          soft: "var(--gold-soft)",
          line: "var(--gold-line)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
        },
      },

      // Bare `border` uses the token, so nothing has to remember to opt in.
      borderColor: {
        DEFAULT: "var(--border)",
      },

      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        ui: ["var(--font-ui)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-ui)", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      fontSize: {
        "display-xl": ["clamp(2.75rem, 7vw, 4.75rem)", { lineHeight: "1.02", letterSpacing: "-0.025em" }],
        display: ["clamp(2rem, 4.5vw, 3rem)", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
        h1: ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.015em" }],
        h2: ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        eyebrow: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.18em" }],
        body: ["0.9375rem", { lineHeight: "1.65" }],
        ui: ["0.8125rem", { lineHeight: "1.45" }],
        meta: ["0.6875rem", { lineHeight: "1.4" }],
        "numeric-lg": ["2.5rem", { lineHeight: "1", letterSpacing: "-0.02em" }],
        "numeric-md": ["1.5rem", { lineHeight: "1", letterSpacing: "-0.015em" }],
      },

      // Nothing larger than 8px. `rounded-lg` is deliberately clamped so an
      // accidental use can't drift into template-SaaS territory.
      borderRadius: {
        DEFAULT: "var(--r-sm)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-md)",
        xl: "var(--r-md)",
      },

      boxShadow: {
        e1: "var(--shadow-e1)",
      },

      maxWidth: {
        content: "1120px",
        shell: "1440px",
        prose: "68ch",
      },

      spacing: {
        rail: "220px",
        panel: "320px",
      },

      transitionTimingFunction: {
        out: "var(--ease-out)",
        io: "var(--ease-io)",
      },

      transitionDuration: {
        fast: "160ms",
        DEFAULT: "240ms",
        slow: "420ms",
      },

      keyframes: {
        "fade-rise": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-blur": {
          from: { opacity: "0", filter: "blur(8px)", transform: "translateY(10px)" },
          to: { opacity: "1", filter: "blur(0)", transform: "none" },
        },
        orbit: {
          to: { transform: "rotate(360deg)" },
        },
        "pulse-node": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },

      animation: {
        "fade-rise": "fade-rise var(--dur) var(--ease-out) both",
        "fade-in": "fade-in var(--dur) var(--ease-out) both",
        "fade-blur": "fade-blur var(--dur-slow) var(--ease-out) both",
        "orbit-slow": "orbit 44s linear infinite",
        "orbit-slower": "orbit 72s linear infinite reverse",
        "pulse-node": "pulse-node 1.4s var(--ease-io) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
