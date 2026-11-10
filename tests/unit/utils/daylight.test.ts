import { expect, it } from "vitest";
import { legacyDaylightResolver } from "../../../server/utils/daylight";

it.each([
  ["2026-03-27", "2026-03-27T15:30:00.000Z"],
  ["2026-10-25", "2026-10-25T16:30:00.000Z"],
])("resolves Jerusalem sunset on DST transition day %s", (day, expected) => {
  const resolve = legacyDaylightResolver("Asia/Jerusalem", "00:00", "18:30");
  const daylight = resolve(new Date(`${day}T10:00Z`));
  expect(daylight?.sunset.toISOString()).toBe(expected);
  expect(daylight?.sunrise.toISOString()).toBe(
    day === "2026-03-27" ? "2026-03-26T22:00:00.000Z" : "2026-10-24T21:00:00.000Z",
  );
});

it("advances a nonexistent Jerusalem boundary to the first valid local minute", () => {
  const resolve = legacyDaylightResolver("Asia/Jerusalem", "02:30", "18:30");
  expect(resolve(new Date("2026-03-27T10:00Z"))?.sunrise.toISOString()).toBe(
    "2026-03-27T00:00:00.000Z",
  );
});

it("uses earliest sunrise and latest sunset during a repeated Jerusalem hour", () => {
  const resolve = legacyDaylightResolver("Asia/Jerusalem", "01:15", "01:45");
  const daylight = resolve(new Date("2026-10-25T10:00Z"));
  expect(daylight?.sunrise.toISOString()).toBe("2026-10-24T22:15:00.000Z");
  expect(daylight?.sunset.toISOString()).toBe("2026-10-24T23:45:00.000Z");
});

it("resolves each local date independently and does not share cached timezone/pair values", () => {
  const resolve = legacyDaylightResolver("Asia/Jerusalem", "06:15", "18:30");
  expect(resolve(new Date("2026-03-26T10:00Z"))?.sunset.toISOString()).toBe(
    "2026-03-26T16:30:00.000Z",
  );
  expect(resolve(new Date("2026-03-27T10:00Z"))?.sunset.toISOString()).toBe(
    "2026-03-27T15:30:00.000Z",
  );
  expect(
    legacyDaylightResolver(
      "UTC",
      "06:15",
      "17:45",
    )(new Date("2026-03-27T10:00Z"))?.sunset.toISOString(),
  ).toBe("2026-03-27T17:45:00.000Z");
});
