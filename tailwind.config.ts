import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0B0C10", 900: "#0B0C10", 800: "#121419", 700: "#1A1D24", 600: "#252932", 500: "#3A3F4B" },
        cream: { DEFAULT: "#F5F0E8", muted: "#B9B3A9", dim: "#7D786F" },
        ember: { DEFAULT: "#FF6B4A", soft: "#FF8F75", deep: "#E04A28" },
        mint: { DEFAULT: "#3DDC97", soft: "#7BE8B8" },
        gold: { DEFAULT: "#F5C451", soft: "#F9D885" },
        iris: { DEFAULT: "#8B7CF6", soft: "#B1A7FA" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { "4xl": "2rem" },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        rise: { "0%": { opacity: "0", transform: "translateY(28px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pop: { "0%": { opacity: "0", transform: "scale(0)" }, "70%": { transform: "scale(1.12)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        grow: { "0%": { width: "0" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        rise: "rise 0.9s cubic-bezier(0.22,1,0.36,1) both",
        pop: "pop 0.5s cubic-bezier(0.22,1,0.36,1) both",
        grow: "grow 1.4s cubic-bezier(0.22,1,0.36,1) 0.8s both",
      },
    },
  },
  plugins: [],
};

export default config;
