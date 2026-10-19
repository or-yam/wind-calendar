import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const domTests = [
  "tests/unit/components/**/*.test.{ts,tsx}",
  "tests/unit/hooks/**/*.test.{ts,tsx}",
  "tests/unit/App.test.ts",
  "tests/integration/*.test.tsx",
];

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.test.{ts,tsx}"],
          exclude: domTests,
        },
      },
      {
        extends: true,
        test: { name: "dom", environment: "jsdom", include: domTests },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
