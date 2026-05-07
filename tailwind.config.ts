import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F14",
        panel: "#111827",
        border: "#1F2937",
        primary: "#00FFA3", // green
        accent: "#00C2FF",  // blue
        muted: "#9CA3AF",
      },
    },
  },
  plugins: [],
};

export default config;