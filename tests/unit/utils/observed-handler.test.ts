import { inspect } from "node:util";
import { afterEach, expect, it, vi } from "vitest";
import { Effect } from "effect";
import { observedHandler } from "../../../server/utils/observed-handler";
import { runLoggedEffect } from "../../../server/utils/logging";
import { callHandler } from "../../helpers/nitro-mocks";

afterEach(() => vi.restoreAllMocks());

it("does not expose raw unexpected errors in console output or the response", async () => {
  const calls: unknown[][] = [];
  for (const method of ["log", "debug", "info", "warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation((...args) => {
      calls.push(args);
    });
  }
  const handler = observedHandler("/api/test", async () =>
    runLoggedEffect(Effect.die(new Error("Authorization: Bearer private-token; user prompt"))),
  );
  const response = await callHandler(handler, "/api/test?token=private-token");
  expect(response.statusCode).toBe(500);
  expect(calls).toHaveLength(1);
  expect(inspect(calls, { depth: null })).not.toMatch(/private-token|user prompt/);
  expect(response.body).not.toMatch(/private-token|user prompt/);
});
