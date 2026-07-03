import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#1e1b4b",
        },
        // Optimora primary palette
        op: {
          purple:      "#7C3AED",
          "purple-md": "#8B5CF6",
          "purple-lt": "#A855F7",
          "purple-bg": "#F5F3FF",
          "purple-border": "#DDD6FE",
          orange:      "#FF7A3D",
          "orange-md": "#FB923C",
          "orange-bg": "#FFF7ED",
          pink:        "#EC4899",
          text:        "#0F1020",
          muted:       "#6B7280",
          border:      "#EAEAF2",
          "bg-soft":   "#FBFAFF",
          "bg-white":  "#FFFFFF",
          success:     "#22C55E",
          warning:     "#F59E0B",
          danger:      "#EF4444",
        },
        accent: {
          orange: "#f97316",
          "orange-light": "#fed7aa",
          purple: "#a855f7",
          "purple-light": "#e9d5ff",
        },
      },
      backgroundImage: {
        "hero-gradient":    "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        "orange-glow":      "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(255,122,61,0.10) 0%, transparent 70%)",
        "brand-gradient":   "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
        "orange-gradient":  "linear-gradient(135deg, #FF7A3D 0%, #FB923C 100%)",
        "upgrade-gradient": "linear-gradient(135deg, #FF7A3D 0%, #F97316 40%, #7C3AED 100%)",
        "card-glass":       "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
        "sidebar-glow":     "radial-gradient(ellipse 120% 60% at 50% 110%, rgba(124,58,237,0.08) 0%, transparent 70%)",
      },
      boxShadow: {
        "card":    "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-md": "0 4px 12px 0 rgba(0,0,0,0.08), 0 1px 3px -1px rgba(0,0,0,0.04)",
        "op-btn":  "0 2px 8px 0 rgba(124,58,237,0.30)",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%":      { opacity: "1" },
        },
        "slide-in-right": {
          "0%":   { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up":        "fade-up 0.5s ease-out both",
        "fade-in":        "fade-in 0.4s ease-out both",
        float:            "float 4s ease-in-out infinite",
        "float-slow":     "float 6s ease-in-out infinite",
        "glow-pulse":     "glow-pulse 3s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
