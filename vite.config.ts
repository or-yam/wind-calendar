import { defineConfig, loadEnv } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { getSentryOrigin } from "./shared/sentry-config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Inject Content-Security-Policy meta tag based on build mode.
 * Dev: Relaxed CSP with 'unsafe-inline' for Vite HMR.
 * Prod: Strict CSP without 'unsafe-inline' for scripts.
 */
function injectCSP(sentryOrigin?: string): Plugin {
  return {
    name: "inject-csp",
    transformIndexHtml(html, ctx) {
      const isDev = ctx.server !== undefined; // Vite dev server is running

      const connectSources = [
        "'self'",
        "https://va.vercel-scripts.com",
        ...(sentryOrigin ? [sentryOrigin] : []),
      ].join(" ");
      const csp = isDev
        ? // Development: Allow inline scripts for Vite HMR
          `default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src ${connectSources} http://localhost:* ws://localhost:*; img-src 'self' data:; frame-ancestors 'none'`
        : // Production: Strict CSP, no 'unsafe-inline' for scripts
          `default-src 'self'; script-src 'self' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src ${connectSources}; img-src 'self' data:; frame-ancestors 'none'`;

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

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const sentryOrigin = getSentryOrigin(env.VITE_SENTRY_DSN);
  const canUploadSourceMaps = Boolean(
    command === "build" && env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT,
  );
  const release = env.SENTRY_RELEASE || env.VERCEL_GIT_COMMIT_SHA;

  return {
    plugins: [
      nitro(),
      react(),
      tailwindcss(),
      injectCSP(sentryOrigin),
      ...(canUploadSourceMaps
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              release: release ? { name: release } : undefined,
              telemetry: false,
              sourcemaps: {
                filesToDeleteAfterUpload: ["./.vercel/output/static/**/*.map"],
              },
            }),
          ]
        : []),
    ],
    build: { sourcemap: canUploadSourceMaps ? "hidden" : false },
    define: {
      "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(release || ""),
      "import.meta.env.VITE_SENTRY_ENVIRONMENT": JSON.stringify(
        env.SENTRY_ENVIRONMENT || env.VERCEL_ENV || "",
      ),
      "import.meta.env.VITE_SENTRY_DEPLOYMENT_ENVIRONMENT": JSON.stringify(env.VERCEL_ENV || ""),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "./shared"),
      },
    },
  };
});
