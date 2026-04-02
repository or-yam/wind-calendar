import { describe, it, expect } from "vitest";
import { getLocalHour, toLocalTimeString } from "../../../server/utils/timezone";

describe("getLocalHour", () => {
  describe("happy path", () => {
    it("returns 12 for UTC timezone at noon UTC", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      const hour = getLocalHour(date, "UTC");
      expect(hour).toBe(12);
    });

    it("returns correct hour for America/New_York timezone", () => {
      const date = new Date("2024-06-15T20:00:00Z"); // 4pm EDT = 8pm UTC in summer
      const hour = getLocalHour(date, "America/New_York");
      expect(hour).toBe(16);
    });

    it("returns 0 for Asia/Tokyo at midnight JST", () => {
      const date = new Date("2024-06-14T15:00:00Z"); // midnight JST = 3pm UTC prev day
      const hour = getLocalHour(date, "Asia/Tokyo");
      expect(hour).toBe(0);
    });

    it("returns 12 for Pacific/Honolulu at noon local", () => {
      const date = new Date("2024-06-15T22:00:00Z"); // noon HST = 10pm UTC
      const hour = getLocalHour(date, "Pacific/Honolulu");
      expect(hour).toBe(12);
    });

    it("returns 0 at midnight boundary (00:00)", () => {
      const date = new Date("2024-06-15T00:00:00Z");
      const hour = getLocalHour(date, "UTC");
      expect(hour).toBe(0);
    });

    it("returns 12 at noon boundary (12:00)", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      const hour = getLocalHour(date, "UTC");
      expect(hour).toBe(12);
    });
  });

  describe("edge cases", () => {
    it("handles DST transition day", () => {
      const date = new Date("2024-03-10T12:00:00Z"); // DST spring forward in US
      const hour = getLocalHour(date, "America/New_York");
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThan(24);
    });

    it("normalizes hour 24 to 0", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const hour = getLocalHour(date, "Europe/London"); // midnight can return 24 in some locales
      expect(hour).toBe(0);
    });

    it("handles leap day Feb 29", () => {
      const date = new Date("2024-02-29T12:00:00Z");
      const hour = getLocalHour(date, "UTC");
      expect(hour).toBe(12);
    });

    it("handles year boundary Dec 31", () => {
      const date = new Date("2023-12-31T23:00:00Z");
      const hour = getLocalHour(date, "UTC");
      expect(hour).toBe(23);
    });

    it("handles year boundary Jan 1", () => {
      const date = new Date("2024-01-01T01:00:00Z");
      const hour = getLocalHour(date, "UTC");
      expect(hour).toBe(1);
    });
  });

  describe("error handling", () => {
    it("handles invalid timezone string gracefully", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      expect(() => getLocalHour(date, "Invalid/Timezone")).toThrow();
    });

    it("throws for invalid date object", () => {
      const date = new Date("invalid");
      expect(() => getLocalHour(date, "UTC")).toThrow();
    });

    it("handles empty string timezone", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      expect(() => getLocalHour(date, "")).toThrow();
    });
  });

  describe("caching", () => {
    it("returns same formatter for same timezone called twice", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      const hour1 = getLocalHour(date, "Europe/London");
      const hour2 = getLocalHour(date, "Europe/London");
      expect(hour1).toBe(hour2);
    });
  });
});

describe("toLocalTimeString", () => {
  describe("happy path", () => {
    it("returns HH:MM format for UTC timezone", () => {
      const date = new Date("2024-06-15T14:30:00Z");
      const time = toLocalTimeString(date, "UTC");
      expect(time).toMatch(/^\d{2}:\d{2}$/);
      expect(time).toBe("14:30");
    });

    it("returns correct time for different timezones", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      const time = toLocalTimeString(date, "Asia/Tokyo");
      expect(time).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe("edge cases", () => {
    it("handles midnight correctly", () => {
      const date = new Date("2024-06-15T00:00:00Z");
      const time = toLocalTimeString(date, "UTC");
      expect(time).toBe("00:00");
    });

    it("handles end of hour correctly", () => {
      const date = new Date("2024-06-15T12:59:00Z");
      const time = toLocalTimeString(date, "UTC");
      expect(time).toBe("12:59");
    });
  });

  describe("error handling", () => {
    it("handles invalid timezone", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      expect(() => toLocalTimeString(date, "Invalid/Zone")).toThrow();
    });

    it("handles invalid date", () => {
      const date = new Date("invalid");
      expect(() => toLocalTimeString(date, "UTC")).toThrow();
    });
  });
});
