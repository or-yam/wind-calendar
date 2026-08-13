import { defineConfig } from "nitro";
import { withSentryConfig } from "@sentry/nitro";

const canUploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

const config = defineConfig({
  serverDir: "./server",
  preset: "vercel",
  routeRules: {
    "/api/**": {
      cors: true,
    },
  },
});

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release:
    process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA
      ? { name: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA }
      : undefined,
  telemetry: false,
  sourcemaps: { disable: !canUploadSourceMaps },
});
