import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        mist: "#f4f6f8",
        line: "#dde3e9",
        accent: "#1565c0"
      },
      boxShadow: {
        jotter: "0 20px 60px rgba(16, 20, 24, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
