import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { inspect } from "node:util";
import forecast from "../../../server/api/forecast";
import calendar from "../../../server/api/calendar";
import { callHandler } from "../../helpers/nitro-mocks";
import { mockExternalFetch, providerResponse } from "../../helpers/provider-http";
import { PROVIDER_HOURS, PROVIDER_NOW } from "../../helpers/provider-hours";

vi.mock("../../../server/utils/rate-limit", () => ({
  checkRateLimit: () => ({ limited: false }),
}));

beforeEach(() => vi.setSystemTime(new Date(PROVIDER_NOW)));
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("keeps concurrent requests and parallel locations correlated", async () => {
  const calls: unknown[][] = [];
  for (const method of ["log", "debug", "info", "warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation((...args) => {
      calls.push(args);
    });
  }
  mockExternalFetch(async (url) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return providerResponse(url, {
      "beit-yanai": PROVIDER_HOURS,
      "tel-aviv": PROVIDER_HOURS,
      herzliya: PROVIDER_HOURS,
    });
  });
  const responses = await Promise.all([
    callHandler(forecast, "/api/forecast?locations=beit-yanai,tel-aviv&model=om_gfs"),
    callHandler(calendar, "/api/calendar?location=herzliya&model=om_gfs"),
  ]);
  const ids = responses.map((response) => response.headers["x-request-id"]);
  expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
  expect(ids.every(Boolean)).toBe(true);
  expect(new Set(ids).size).toBe(2);
  const logs = calls.map(([line]) => JSON.parse(String(line)));
  expect(logs.every((entry) => ids.includes(entry.requestId))).toBe(true);
  for (const [index, id] of ids.entries()) {
    const entries = logs.filter((entry) => entry.requestId === id);
    expect(
      entries.every((entry) => entry.endpoint === (index ? "/api/calendar" : "/api/forecast")),
    ).toBe(true);
    expect(
      new Set(entries.filter((entry) => entry.location).map((entry) => entry.location)),
    ).toEqual(new Set(index ? ["herzliya"] : ["beit-yanai", "tel-aviv"]));
    expect(entries.filter((entry) => entry.event === "request_completed")).toHaveLength(1);
  }
  expect(inspect(calls, { depth: null })).not.toContain("request_failed");
});
