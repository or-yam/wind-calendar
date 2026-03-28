import { describe, it, expect } from "vitest";
import {
  getWeekStart,
  addDays,
  sameDay,
  isToday,
  formatWeekRange,
  formatTime,
  formatTimeFromDate,
  getDayNames,
} from "../../../src/lib/date-utils.js";

describe("getWeekStart", () => {
  describe("happy path", () => {
    it("returns Monday when startOnSunday is false", () => {
      const wed = new Date("2024-06-12"); // Wednesday
      const weekStart = getWeekStart(wed, false);
      expect(weekStart.getDay()).toBe(1); // Monday
    });

    it("returns Sunday when startOnSunday is true", () => {
      const wed = new Date("2024-06-12"); // Wednesday
      const weekStart = getWeekStart(wed, true);
      expect(weekStart.getDay()).toBe(0); // Sunday
    });

    it("returns same day if already Monday", () => {
      const mon = new Date("2024-06-10"); // Monday
      const weekStart = getWeekStart(mon, false);
      expect(weekStart.getDay()).toBe(1);
      expect(weekStart.getDate()).toBe(10);
    });
  });

  describe("edge cases", () => {
    it("handles week spanning year boundary", () => {
      const date = new Date("2024-01-01"); // Monday
      const weekStart = getWeekStart(date, false);
      expect(weekStart.getFullYear()).toBe(2024);
    });

    it("handles week spanning month boundary", () => {
      const date = new Date("2024-03-31"); // Sunday
      const weekStart = getWeekStart(date, false);
      expect(weekStart.getMonth()).toBe(2); // March
    });

    it("handles DST transition", () => {
      const date = new Date("2024-03-10"); // DST spring forward day
      const weekStart = getWeekStart(date, false);
      expect(weekStart).toBeInstanceOf(Date);
    });
  });
});

describe("addDays", () => {
  describe("happy path", () => {
    it("adds positive days", () => {
      const date = new Date("2024-06-15");
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(20);
    });

    it("subtracts negative days", () => {
      const date = new Date("2024-06-15");
      const result = addDays(date, -5);
      expect(result.getDate()).toBe(10);
    });
  });

  describe("edge cases", () => {
    it("handles month end (Jan 31 + 1 = Feb 1)", () => {
      const date = new Date("2024-01-31");
      const result = addDays(date, 1);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(1);
    });

    it("handles leap day Feb 29", () => {
      const date = new Date("2024-02-29");
      const result = addDays(date, 1);
      expect(result.getMonth()).toBe(2); // March
      expect(result.getDate()).toBe(1);
    });

    it("handles year boundary", () => {
      const date = new Date("2024-12-31");
      const result = addDays(date, 1);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(1);
    });
  });

  describe("error handling", () => {
    it("handles invalid date object", () => {
      const date = new Date("invalid");
      const result = addDays(date, 5);
      expect(result).toBeInstanceOf(Date);
    });
  });
});

describe("sameDay", () => {
  describe("happy path", () => {
    it("returns true for same date", () => {
      const a = new Date("2024-06-15T10:00:00");
      const b = new Date("2024-06-15T22:30:00");
      expect(sameDay(a, b)).toBe(true);
    });

    it("returns false for different dates", () => {
      const a = new Date("2024-06-15");
      const b = new Date("2024-06-16");
      expect(sameDay(a, b)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles different months", () => {
      const a = new Date("2024-06-15");
      const b = new Date("2024-07-15");
      expect(sameDay(a, b)).toBe(false);
    });

    it("handles different years", () => {
      const a = new Date("2024-06-15");
      const b = new Date("2025-06-15");
      expect(sameDay(a, b)).toBe(false);
    });
  });
});

describe("isToday", () => {
  it("returns true for today", () => {
    const today = new Date();
    expect(isToday(today)).toBe(true);
  });

  it("returns false for yesterday", () => {
    const yesterday = addDays(new Date(), -1);
    expect(isToday(yesterday)).toBe(false);
  });

  it("returns false for tomorrow", () => {
    const tomorrow = addDays(new Date(), 1);
    expect(isToday(tomorrow)).toBe(false);
  });
});

describe("formatWeekRange", () => {
  it("formats within month correctly", () => {
    const weekStart = new Date("2026-03-29");
    const result = formatWeekRange(weekStart);
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/2026/);
  });

  it("handles week spanning month boundary", () => {
    const weekStart = new Date("2026-03-29");
    const result = formatWeekRange(weekStart);
    expect(result).toContain("Mar");
    expect(result).toContain("Apr");
  });

  it("handles week spanning year boundary", () => {
    const weekStart = new Date("2025-12-29");
    const result = formatWeekRange(weekStart);
    expect(result).toContain("Dec");
    expect(result).toContain("Jan");
    expect(result).toContain("2025");
    expect(result).toContain("2026");
  });
});

describe("formatTime", () => {
  it("formats normal values", () => {
    expect(formatTime(9, 30)).toBe("09:30");
  });

  it("pads single digit hours", () => {
    expect(formatTime(1, 5)).toBe("01:05");
  });

  it("handles midnight", () => {
    expect(formatTime(0, 0)).toBe("00:00");
  });

  it("handles end of day", () => {
    expect(formatTime(23, 59)).toBe("23:59");
  });
});

describe("formatTimeFromDate", () => {
  it("extracts hours and minutes from date", () => {
    const date = new Date("2024-06-15T14:30:00");
    expect(formatTimeFromDate(date)).toBe("14:30");
  });
});

describe("getDayNames", () => {
  it("returns Sunday-first when true", () => {
    const names = getDayNames(true);
    expect(names[0]).toBe("Sun");
    expect(names[6]).toBe("Sat");
  });

  it("returns Monday-first when false", () => {
    const names = getDayNames(false);
    expect(names[0]).toBe("Mon");
    expect(names[6]).toBe("Sun");
  });
});
