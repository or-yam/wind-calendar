import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { buildContentSecurityPolicy } from "./shared/posthog-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Inject Content-Security-Policy meta tag based on build mode.
 * Dev: Relaxed CSP with 'unsafe-inline' for Vite HMR.
 * Prod: Strict CSP without 'unsafe-inline' for scripts.
 */
function injectCSP(postHogHost?: string): Plugin {
  return {
    name: "inject-csp",
    transformIndexHtml(html, ctx) {
      const isDev = ctx.server !== undefined; // Vite dev server is running

      const csp = buildContentSecurityPolicy(isDev, postHogHost);

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

export default defineConfig(({ mode }) => ({
  plugins: [
    nitro(),
    react(),
    tailwindcss(),
    injectCSP(loadEnv(mode, process.cwd(), "VITE_POSTHOG_").VITE_POSTHOG_HOST),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));
