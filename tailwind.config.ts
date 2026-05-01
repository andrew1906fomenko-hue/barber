import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F7F8FB",
        section: "rgba(255, 255, 255, 0.36)",
        card: "rgba(255, 255, 255, 0.58)",
        text: "#111827",
        muted: "#6B7280",
        border: "rgba(255, 255, 255, 0.58)",
        accent: "#3B82F6",
        accentSoft: "rgba(59, 130, 246, 0.14)",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(15, 23, 42, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.70)",
      },
      borderRadius: {
        soft: "18px",
      },
    },
  },
  plugins: [],
};

export default config;
