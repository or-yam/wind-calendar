import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "./server",
  compatibilityDate: "2025-07-15",
  preset: "vercel",
  routeRules: {
    "/api/**": {
      cors: true,
    },
  },
});
