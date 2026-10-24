import { describe, expect, it } from "vitest";
import { getLocationName } from "../../../src/i18n/locations";
import {
  formatNumber,
  formatTime,
  formatWeekRange,
  getDayNames,
} from "../../../src/lib/date-utils";

describe("Hebrew formatting", () => {
  it("formats dates and preserves Sunday-first weeks", () => {
    expect(formatWeekRange(new Date(2026, 2, 29), "he")).toMatch(/2026/);
    expect(getDayNames(true, "he")[0]).toMatch(/יום א|א׳/);
  });

  it("formats 24-hour times and numbers through Hebrew Intl", () => {
    expect(formatTime(9, 5, "he")).toBe("09:05");
    expect(formatNumber(1234.5, "he")).toBe(new Intl.NumberFormat("he-IL").format(1234.5));
  });

  it("localizes known locations and falls back for unknown IDs", () => {
    expect(getLocationName("tel-aviv", "he")).toBe("תל אביב");
    expect(getLocationName("unknown", "he", "Unknown beach")).toBe("Unknown beach");
  });
});
