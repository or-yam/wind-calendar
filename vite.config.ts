import { defineConfig, loadEnv } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { injectCSP } from "./vite-plugins/csp.ts";
import { portless } from "./vite-plugins/portless.ts";
import { getSentryOrigin } from "./shared/sentry-config.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      portless(),
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
