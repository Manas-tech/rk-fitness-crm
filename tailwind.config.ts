import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F8FA",
        surface: "#FFFFFF",
        primary: {
          DEFAULT: "#167D5A",
          hover: "#12684B",
          light: "#E8F5F0",
          dark: "#0E523A",
        },
        ink: {
          primary: "#17191F",
          secondary: "#697386",
          muted: "#9AA2B1",
        },
        border: {
          DEFAULT: "#E6E8EC",
          subtle: "#F0F2F5",
        },
        status: {
          success: {
            text: "#0E8345",
            bg: "#EBF8F1",
            border: "#C3EBD7",
          },
          warning: {
            text: "#B45309",
            bg: "#FEF7E6",
            border: "#FDE68A",
          },
          danger: {
            text: "#C53030",
            bg: "#FEF2F2",
            border: "#FECACA",
          },
          neutral: {
            text: "#4B5563",
            bg: "#F3F4F6",
            border: "#E5E7EB",
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
