import { defineConfig } from "vitest/config";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const domTests = [
  "tests/unit/components/**/*.test.{ts,tsx}",
  "tests/unit/hooks/**/*.test.{ts,tsx}",
  "tests/unit/App.test.ts",
  "tests/unit/i18n/resources.test.ts",
  "tests/integration/*.test.tsx",
];

export default defineConfig({
  plugins: [babel({ presets: [reactCompilerPreset({ compilationMode: "annotation" })] })],
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
        test: {
          name: "dom",
          environment: "jsdom",
          include: domTests,
          setupFiles: ["./tests/setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
