import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "./server",
  preset: "vercel",
  routeRules: {
    "/api/**": {
      cors: true,
    },
  },
});
