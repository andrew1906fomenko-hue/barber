import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FFFFFF",
        section: "#F8FAFC",
        card: "#FFFFFF",
        text: "#111827",
        muted: "#6B7280",
        border: "#E5E7EB",
        accent: "#FF4F73",
        accentSoft: "#FFF1F4",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(17, 24, 39, 0.06)",
      },
      borderRadius: {
        soft: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
