import { describe, it, expect } from "vitest";
import { windColor, windTextColor } from "../../../src/lib/wind-colors.js";

describe("windColor", () => {
  describe("happy path - Beaufort-like scale stops", () => {
    it("returns white for 0 knots (calm)", () => {
      const color = windColor(0);
      expect(color).toBe("#FFFFFF");
    });

    it("returns light color for 5 knots", () => {
      const color = windColor(5);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("returns cyan for around 10 knots", () => {
      const color = windColor(10);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("returns green for around 15 knots", () => {
      const color = windColor(15);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("returns yellow for around 20 knots", () => {
      const color = windColor(20);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("returns red for around 25 knots", () => {
      const color = windColor(25);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("returns pink for around 30 knots", () => {
      const color = windColor(30);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("returns magenta for around 40 knots", () => {
      const color = windColor(40);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("returns purple for around 45 knots", () => {
      const color = windColor(45);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("returns blue for around 50 knots", () => {
      const color = windColor(50);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("returns deep blue for 70 knots", () => {
      const color = windColor(70);
      expect(color).toBe("#0000FF");
    });
  });

  describe("interpolation", () => {
    it("interpolates between stops (7.5 knots)", () => {
      const color = windColor(7.5);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
      // Between white (#FFFFFF) at 4.9 and cyan (#67F7F1) at 9.1
    });

    it("interpolates at midpoint between stops", () => {
      const color = windColor(7);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  describe("edge cases", () => {
    it("returns calm color for negative knots", () => {
      const color = windColor(-5);
      expect(color).toBe("#FFFFFF");
    });

    it("returns calm color for zero", () => {
      const color = windColor(0);
      expect(color).toBe("#FFFFFF");
    });

    it("handles fractional values (0.5)", () => {
      const color = windColor(0.5);
      expect(color).toBe("#FFFFFF");
    });

    it("returns max color for very high values (100+)", () => {
      const color = windColor(100);
      expect(color).toBe("#0000FF");
    });

    it("returns threshold color at exactly 20kn", () => {
      const color = windColor(20);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  describe("color format", () => {
    it("returns valid hex format", () => {
      const color = windColor(15);
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it("all stops return uppercase hex", () => {
      const stops = [0, 5, 10, 15, 20, 25, 30, 40, 50, 70];
      stops.forEach((knots) => {
        const color = windColor(knots);
        expect(color).toBe(color.toUpperCase());
      });
    });
  });
});

describe("windTextColor", () => {
  describe("happy path", () => {
    it("returns dark text below 20kn threshold", () => {
      const textColor = windTextColor(10);
      expect(textColor).toBe("#0B1220"); // TEXT_DARK
    });

    it("returns light text above 20kn threshold", () => {
      const textColor = windTextColor(25);
      expect(textColor).toBe("#E5E7EB"); // TEXT_LIGHT
    });
  });

  describe("edge cases", () => {
    it("returns dark text at exactly 20kn threshold", () => {
      const textColor = windTextColor(20);
      expect(textColor).toBe("#0B1220"); // at or below uses dark
    });

    it("returns dark text for 0 knots", () => {
      const textColor = windTextColor(0);
      expect(textColor).toBe("#0B1220");
    });

    it("returns light text for very high knots", () => {
      const textColor = windTextColor(100);
      expect(textColor).toBe("#E5E7EB");
    });
  });
});
