import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fffaf4",
          100: "#fff0d8",
          200: "#ffd7ad"
        },
        rosewood: "#9f4f3d",
        cocoa: "#2b1d18",
        sage: "#6d815f",
        peach: "#ffb26f",
        mint: "#e3f4dc",
        berry: "#d85b66",
        butter: "#ffd76f",
        melon: "#ff914d",
        papaya: "#ff6f3c",
        porcelain: "#fffdf9"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(92, 51, 26, 0.12)",
        premium: "0 24px 70px rgba(255, 111, 60, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
