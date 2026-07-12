import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── EcoSphere frontend palette (keeps every existing component styled) ──
        brand: {
          50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399",
          500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b", 950: "#022c22",
        },
        teal: { 500: "#14b8a6", 600: "#0d9488" },
        // ── Pasted reference palette (ESG pillar accents / dark surfaces) ──
        bg: "#121212",
        panel: "#161718",
        panel2: "#1b1d1f",
        row: "#202325",
        borderMuted: "#33383d",
        ink: "#b7bcc1",
        faint: "#6e757c",
        env: "#39994b",
        social: "#56a2e8",
        gov: "#b595ff",
        game: "#f17634",
        overall: "#68aae7",
        danger: "#ff8383",
        warn: "#b86200",
        ok: "#39994b",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Nexo", "Kora", "Inter", "ui-serif", "Georgia", "serif"],
        brand: ["Nexo", "Kora", "Inter", "ui-sans-serif", "sans-serif"],
      },
      borderRadius: { "2xl": "1rem", "3xl": "1.5rem" },
      boxShadow: {
        soft: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        card: "0 4px 24px -8px rgb(16 24 40 / 0.10)",
        lift: "0 12px 40px -12px rgb(16 24 40 / 0.25)",
        glow: "0 0 0 1px rgb(16 185 129 / 0.2), 0 8px 30px -8px rgb(16 185 129 / 0.35)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "slide-in-right": { "0%": { opacity: "0", transform: "translateX(100%)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        "slide-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-ring": { "0%": { transform: "scale(0.8)", opacity: "0.5" }, "100%": { transform: "scale(2.4)", opacity: "0" } },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
