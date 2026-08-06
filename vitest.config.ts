/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    // A suíte Playwright vive em `e2e/` e usa `*.e2e.ts`; a exclusão é
    // salvaguarda para o dia em que alguém nomear um arquivo de lá `.spec.ts`
    // — o Vitest tentaria rodá-lo em jsdom e quebraria por falta de browser.
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    css: false,
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
