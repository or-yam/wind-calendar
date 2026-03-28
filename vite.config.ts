import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
