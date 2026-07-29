import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0B1E39",
        panel: "#0F2A4A",
        accent: "#14B8A6",
        signal: "#14B8A6",
        mist: "#F7F8FA",
        line: "rgba(15, 42, 74, 0.14)",
        ink: "#0B1E39",
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626"
      },
      boxShadow: {
        industrial: "0 18px 50px rgba(11, 30, 57, 0.14)",
        glow: "0 16px 36px rgba(20, 184, 166, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
