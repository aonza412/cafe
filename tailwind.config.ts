import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // เชื่อมชื่อ Class ของ Tailwind เข้ากับตัวแปร CSS
      colors: {
        theme: {
          bg: "var(--bg-main)",
          paper: "var(--bg-paper)",
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          accent: "var(--col-accent)",
          muted: "var(--col-muted)",
        },
      },
      fontFamily: {
        sarabun: ["Sarabun", "sans-serif"],
        ibm: ["IBM Plex Sans Thai", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
