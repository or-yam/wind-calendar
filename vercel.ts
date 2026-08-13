import { routes, deploymentEnv, type VercelConfig } from "@vercel/config/v1";
import { buildContentSecurityPolicy } from "./shared/posthog-config.js";

const isProd = deploymentEnv("VERCEL_ENV") === "production";

const headers = [
  routes.header("/(.*)", [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ]),
];

// Only add CSP HTTP header in production
// In dev, vite.config.ts injects CSP meta tag with 'unsafe-inline' for HMR
if (isProd) {
  headers.push(
    routes.header("/(.*)", [
      {
        key: "Content-Security-Policy",
        value: buildContentSecurityPolicy(false, process.env.VITE_POSTHOG_HOST),
      },
    ]),
  );
}

export const config: VercelConfig = {
  rewrites: [{ source: "/api/:path*", destination: "/api/:path*" }],
  headers,
};
