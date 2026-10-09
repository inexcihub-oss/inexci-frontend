import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.css",
  ],
  theme: {
    screens: {
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          50: "#e6f9f8",
          100: "#ccf3f1",
          200: "#99e7e3",
          300: "#66dbd5",
          400: "#33cfc7",
          500: "#25b4b0",
          600: "#1e908d",
          700: "#147471",
          800: "#0f5c5a",
          900: "#072424",
          950: "#041212",
        },
        secondary: {
          50: "#f0f9ed",
          100: "#e1f3db",
          200: "#c3e7b7",
          300: "#a5db93",
          400: "#87cf6f",
          500: "#6cb764",
          600: "#569250",
          700: "#416e3c",
          800: "#2b4928",
          900: "#162514",
          950: "#0b120a",
        },
        teal: {
          50: "#e6f9f8",
          100: "#ccf3f1",
          200: "#99e7e3",
          300: "#66dbd5",
          400: "#33cfc7",
          500: "#25b4b0",
          600: "#1e908d",
          700: "#147471",
          800: "#0f5c5a",
          900: "#072424",
          950: "#041212",
        },
        neutral: {
          50: "#F2F2F2",
          100: "#DCDFE3",
          200: "#758195",
          900: "#111111",
        },
        status: {
          yellow: {
            bg: "#FFF7D7",
            text: "#805F10",
          },
        },
        priority: {
          baixa: {
            bg: "#D4EFE0",
            text: "#1E6F47",
          },
          media: {
            bg: "#EBF3FF",
            text: "#1D7AFC",
          },
          alta: {
            bg: "#FFF7D7",
            text: "#805F10",
          },
          urgente: {
            bg: "#F0E6E4",
            text: "#601E17",
          },
        },
        chip: {
          baixa: {
            bg: "#D4EFE0",
            text: "#1E6F47",
            hover: "#C0E5D1",
          },
          media: {
            bg: "#D8E8F7",
            text: "#1859A3",
            hover: "#C4DCF0",
          },
          alta: {
            bg: "#FFF3D6",
            text: "#996600",
            hover: "#FFEEC2",
          },
          urgente: {
            bg: "#F4E1E3",
            text: "#7A3B3F",
            hover: "#EDD4D7",
          },
        },
        error: {
          DEFAULT: "#E34935",
          light: "#F0E6E4",
        },
        purple: {
          50: "#F2F0FE",
          100: "#8270DB",
          500: "#8E22D7",
        },
      },
      zIndex: {
        60: "60",
        100: "100",
      },
      width: {
        60: "240px",
        85: "340px",
        88: "352px",
        90: "360px",
      },
      minWidth: {
        8: "32px",
        40: "160px",
        75: "300px",
      },
      height: {
        13: "52px",
        15: "60px",
      },
      minHeight: {
        15: "60px",
        50: "200px",
      },
      fontFamily: {
        urbanist: ["Urbanist", "sans-serif"],
        gotham: ["Gotham", "sans-serif"],
        heading: [
          "var(--font-manrope)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Inter",
          "sans-serif",
        ],
        body: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Inter",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
        18: "4.5rem",
        22: "5.5rem",
      },
      keyframes: {
        "slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(0)", opacity: "1" },
          to: { transform: "translateY(100%)", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "onboarding-confete": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translateY(105vh) rotate(360deg)",
            opacity: "0.9",
          },
        },
      },
      animation: {
        "slide-up": "slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        "slide-down": "slide-down 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "onboarding-confete": "onboarding-confete 2.6s linear forwards",
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    plugin(function ({ addUtilities }) {
      const utils: Record<string, unknown> = {
        ".text-h1": { fontSize: "32px" },
        ".text-h2": { fontSize: "26px" },
        ".text-h3": { fontSize: "20px" },
        ".text-body": { fontSize: "16px" },
        ".text-small": { fontSize: "13px" },
      };
      const md = {
        "@screen md": {
          ".text-h1": { fontSize: "44px" },
          ".text-h2": { fontSize: "32px" },
          ".text-h3": { fontSize: "24px" },
          ".text-body": { fontSize: "17px" },
          ".text-small": { fontSize: "14px" },
        },
      };
      const lg = {
        "@screen lg": {
          ".text-h1": { fontSize: "56px" },
          ".text-h2": { fontSize: "40px" },
          ".text-h3": { fontSize: "28px" },
          ".text-body": { fontSize: "18px" },
          ".text-small": { fontSize: "15px" },
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addUtilities({ ...utils, ...md, ...lg } as any);
    }),
  ],
};

export default config;
