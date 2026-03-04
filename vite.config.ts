import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { Plugin } from "vite";

/**
 * Inject Content-Security-Policy meta tag based on build mode.
 * Dev: Relaxed CSP with 'unsafe-inline' for Vite HMR.
 * Prod: Strict CSP without 'unsafe-inline' for scripts.
 */
function injectCSP(): Plugin {
  return {
    name: "inject-csp",
    transformIndexHtml(html, ctx) {
      const isDev = ctx.server !== undefined; // Vite dev server is running

      const csp = isDev
        ? // Development: Allow inline scripts for Vite HMR
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://va.vercel-scripts.com http://localhost:* ws://localhost:*; img-src 'self' data:; frame-ancestors 'none'"
        : // Production: Strict CSP, no 'unsafe-inline' for scripts
          "default-src 'self'; script-src 'self' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://va.vercel-scripts.com; img-src 'self' data:; frame-ancestors 'none'";

      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content: csp,
          },
          injectTo: "head",
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), injectCSP()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  test: {
    globals: true,
  },
});
