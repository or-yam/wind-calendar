import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { inspect } from "node:util";

process.env.NODE_ENV = "production";
const { default: app } = await import("../../.vercel/output/functions/__server.func/index.mjs");
afterEach(() => mock.restoreAll());

for (const [path, expectedStatus, failure] of [
  ["/api/forecast?location=unknown", 400],
  ["/api/interpret-config", 405],
  ["/api/forecast?model=3", 429, "rate-limit"],
  ["/api/forecast?model=om_gfs", 500, "defect"],
]) {
  test(`production Nitro response retains request ID for ${expectedStatus}`, async () => {
    const calls = [];
    for (const method of ["log", "debug", "info", "warn", "error"]) {
      mock.method(console, method, (...args) => calls.push(args));
    }
    mock.method(globalThis, "fetch", async () => {
      assert.ok(failure, "unexpected upstream call");
      if (failure === "rate-limit") return new Response("private upstream body", { status: 429 });
      return Response.json({
        daily: { sunrise: ["2026-10-20T06:00"], sunset: ["2026-10-20T18:00"] },
        hourly: null,
      });
    });
    const response = await app.fetch(new Request(`https://local.test${path}`));
    assert.equal(response.status, expectedStatus);
    const requestId = response.headers.get("x-request-id");
    assert.match(requestId ?? "", /^[\da-f-]{36}$/);
    const terminal = calls
      .map(([line]) => JSON.parse(line))
      .filter((entry) => entry.event === "request_failed");
    assert.equal(terminal.length, 1);
    assert.equal(terminal[0].requestId, requestId);
    if (expectedStatus === 405) assert.equal("cause" in terminal[0], false);
    assert.doesNotMatch(inspect(calls, { depth: null }), /private upstream body/);
    assert.doesNotMatch(await response.text(), /private upstream body|Cannot destructure/);
  });
}
