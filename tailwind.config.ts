import type { Config } from "tailwindcss";

/**
 * INEXCI Design System - Tailwind CSS Configuration
 *
 * Este arquivo serve como a fonte única de verdade para o design system da aplicação.
 * Todas as cores, espaçamentos, tipografia e outros tokens de design são definidos aqui.
 *
 * @see https://tailwindcss.com/docs/configuration
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /**
       * Sistema de Cores
       *
       * primary: Cor principal da marca (teal/turquesa)
       * secondary: Cor secundária (verde)
       * teal: Variações específicas de teal para componentes
       * neutral: Cores neutras para backgrounds, borders e texto
       * purple: Cores para elementos especiais/status
       */
      colors: {
        // Marca Principal - Teal/Turquesa
        primary: {
          50: "#e6f9f8",
          100: "#ccf3f1",
          200: "#99e7e3",
          300: "#66dbd5",
          400: "#33cfc7",
          500: "#25b4b0", // Cor principal
          600: "#1e908d",
          700: "#166c6a",
          800: "#0f4847",
          900: "#072424",
          950: "#041212",
        },
        // Marca Secundária - Verde
        secondary: {
          50: "#f0f9ed",
          100: "#e1f3db",
          200: "#c3e7b7",
          300: "#a5db93",
          400: "#87cf6f",
          500: "#6cb764", // Cor secundária
          600: "#569250",
          700: "#416e3c",
          800: "#2b4928",
          900: "#162514",
          950: "#0b120a",
        },
        // Teal (mesma paleta da primary, mantida por compatibilidade)
        teal: {
          50: "#e6f9f8",
          100: "#ccf3f1",
          200: "#99e7e3",
          300: "#66dbd5",
          400: "#33cfc7",
          500: "#25b4b0",
          600: "#1e908d",
          700: "#147471",
          800: "#0f4847",
          900: "#072424",
          950: "#041212",
        },
        // Cores Neutras - Para texto, borders e backgrounds
        neutral: {
          50: "#F2F2F2", // Background claro
          100: "#DCDFE3", // Borders
          200: "#758195", // Texto secundário
          900: "#111111", // Texto principal
        },
        // Cores de Status
        status: {
          yellow: {
            bg: "#FFF7D7",
            text: "#805F10",
          },
        },
        // Cores para elementos especiais
        purple: {
          50: "#F2F0FE", // Background roxo claro
          100: "#8270DB", // Roxo médio
          500: "#8E22D7", // Roxo principal
        },
      },
      /**
       * Z-Index
       * Sistema de camadas para controlar sobreposição de elementos
       */
      zIndex: {
        60: "60", // Modais e overlays
        100: "100", // Toasts e notificações
      },
      /**
       * Larguras Customizadas
       * Valores específicos do design da aplicação
       */
      width: {
        60: "240px", // Sidebar width
        85: "340px", // Search bar width
        88: "352px", // Detail panel width
        90: "360px", // Card width
      },
      /**
       * Larguras Mínimas
       */
      minWidth: {
        8: "32px", // Ícones e badges pequenos
        40: "160px", // Dropdowns
        75: "300px", // Modais pequenos
      },
      /**
       * Alturas Customizadas
       */
      height: {
        13: "52px", // Header height
        15: "60px", // Min height para containers
      },
      /**
       * Alturas Mínimas
       */
      minHeight: {
        15: "60px", // Cards e containers mínimos
        50: "200px", // Content areas
      },
      /**
       * Tipografia
       * Fontes personalizadas do projeto
       */
      fontFamily: {
        urbanist: ["Urbanist", "sans-serif"],
        gotham: ["Gotham", "sans-serif"],
      },
      /**
       * Border Radius
       * Mantém consistência nos arredondamentos
       */
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
