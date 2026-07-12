import type { Config } from "tailwindcss";

// Palette lifted from the EcoSphere mockup (dark theme), extended with the
// brand ramp, skeuomorphic shadow tokens and motion keyframes from the
// frontend pass.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // brand green ramp
        brand: {
          50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399",
          500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b", 950: "#022c22",
        },
        teal: { 500: "#14b8a6", 600: "#0d9488" },
        // dark surfaces
        bg: "#121212",
        panel: "#161718",
        panel2: "#1b1d1f",
        row: "#202325",
        border: "#292c30",
        borderMuted: "#33383d",
        ink: "#b7bcc1",
        muted: "#a4aab0",
        faint: "#6e757c",
        // ESG pillar accents
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
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 1px 0 rgba(255,255,255,0.7), 0 2px 4px rgba(0,0,0,0.12)",
        card: "2px 4px 12px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
        lift: "4px 8px 24px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.5)",
        glow: "0 0 0 3px rgba(26,122,80,0.30), 0 4px 16px rgba(26,122,80,0.25)",
        inset: "inset 0 2px 5px rgba(0,0,0,0.20), inset 0 1px 2px rgba(0,0,0,0.14)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "slide-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "pulse-ring": { "0%": { transform: "scale(0.8)", opacity: "0.5" }, "100%": { transform: "scale(2.4)", opacity: "0" } },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
