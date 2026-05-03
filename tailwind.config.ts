import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#5FAF8F",
        primaryHover: "#4C9C7E",
        primaryActive: "#3E866B",
        softBg: "#F4FAF7",
        softSurface: "#EAF4F0",
        disabledBg: "#F3F4F6",
        disabledText: "#C7C9CC",
        error: "#D97777",
        errorBg: "#FBEAEA",
        bg: "#F4FAF7",
        section: "#EAF4F0",
        card: "#FFFFFF",
        text: "#111827",
        muted: "#6B7280",
        border: "#E5E7EB",
        accent: "#5FAF8F",
        accentSoft: "#EAF4F0",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(17, 24, 39, 0.06)",
      },
      borderRadius: {
        soft: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
