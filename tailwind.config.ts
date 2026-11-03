import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10131B",
        panel: "#171B26",
        line: "#282E3B",
        accent: "#8B7CFF",
        mint: "#A5F3D0"
      }
    }
  },
  plugins: []
};
export default config;
