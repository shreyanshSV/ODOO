import type { Config } from "tailwindcss";

// Palette lifted directly from the EcoSphere mockup (dark theme).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
      },
      borderRadius: {
        xl: "0.9rem",
      },
    },
  },
  plugins: [],
};

export default config;
