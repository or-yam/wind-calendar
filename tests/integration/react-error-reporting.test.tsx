import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/react";

const captured = vi.hoisted(() => ({ events: [] as unknown[] }));

vi.mock("@sentry/react", async (importOriginal) => {
  const sdk = await importOriginal<typeof import("@sentry/react")>();
  return {
    ...sdk,
    init: (options: NonNullable<Parameters<typeof sdk.init>[0]>) =>
      sdk.init({
        ...options,
        defaultIntegrations: [],
        transport: () => ({
          send: async () => ({ statusCode: 200 }),
          flush: async () => true,
        }),
        beforeSend: (event, hint) => {
          captured.events.push(event);
          return options.beforeSend ? options.beforeSend(event, hint) : event;
        },
      }),
  };
});

beforeEach(() => {
  vi.resetModules();
  captured.events.length = 0;
  vi.stubEnv("PROD", true);
  vi.stubEnv("MODE", "production");
  vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.invalid/1");
  vi.stubEnv("VITE_SENTRY_DEPLOYMENT_ENVIRONMENT", "preview");
});

afterEach(async () => {
  await Sentry.close(1000);
  Sentry.getCurrentScope().setClient(undefined);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it.each([
  ["onUncaughtError", false],
  ["onCaughtError", true],
  ["onRecoverableError", true],
] as const)("%s preserves console reporting and records handled=%s", async (hook, handled) => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const { reactErrorHandlers } = await import("../../src/error-observability");
  const error = new Error(`React ${hook} verification`);
  reactErrorHandlers?.[hook]?.(error, { componentStack: "" });
  await Sentry.flush(1000);

  expect(log).toHaveBeenCalledWith(error);
  expect(captured.events).toHaveLength(1);
  expect(captured.events[0]).toMatchObject({
    exception: { values: [{ value: error.message, mechanism: { handled } }] },
  });
});

it.each(["", "http://public@example.invalid/1"])(
  "retains React default handlers when monitoring cannot use DSN %s",
  async (dsn) => {
    vi.stubEnv("VITE_SENTRY_DSN", dsn);
    const { reactErrorHandlers } = await import("../../src/error-observability");
    expect(reactErrorHandlers).toBeUndefined();
    expect(Sentry.getClient()).toBeUndefined();
  },
);
