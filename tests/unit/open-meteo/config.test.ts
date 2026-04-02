import { describe, it, expect } from "vitest";
import {
  parseOpenMeteoQueryParams,
  resolveOpenMeteoLocation,
} from "../../../server/open-meteo/config";

describe("parseOpenMeteoQueryParams", () => {
  describe("happy path", () => {
    it("parses all valid params", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "gfs_global",
        wind_min: "10",
        wind_max: "25",
        min_session_hours: "3",
        wave_height_min: "0.5",
      });

      const config = parseOpenMeteoQueryParams(params);

      expect(config.location).toBe("tel-aviv");
      expect(config.model).toBe("gfs_global");
      expect(config.windMin).toBe(10);
      expect(config.windMax).toBe(25);
      expect(config.minSessionHours).toBe(3);
      expect(config.waveHeightMin).toBe(0.5);
    });

    it("uses default values when not provided", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "gfs_global",
      });

      const config = parseOpenMeteoQueryParams(params);

      expect(config.windMin).toBe(14);
      expect(config.windMax).toBe(30);
      expect(config.minSessionHours).toBe(2);
      expect(config.waveHeightMin).toBe(0);
    });

    it("handles windMin=0", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "icon_global",
        wind_min: "0",
        wind_max: "20",
      });

      const config = parseOpenMeteoQueryParams(params);
      expect(config.windMin).toBe(0);
    });

    it("handles windMax = windMin + 1", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "gfs_global",
        wind_min: "10",
        wind_max: "11",
      });

      const config = parseOpenMeteoQueryParams(params);
      expect(config.windMin).toBe(10);
      expect(config.windMax).toBe(11);
    });

    it("handles minSessionHours=0", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "gem_global",
        min_session_hours: "0",
      });

      const config = parseOpenMeteoQueryParams(params);
      expect(config.minSessionHours).toBe(0);
    });
  });

  describe("error handling - missing required params", () => {
    it("throws when location is missing", () => {
      const params = new URLSearchParams({
        model: "om_gfs",
      });

      expect(() => parseOpenMeteoQueryParams(params)).toThrow(
        "Missing required parameter: location",
      );
    });

    it("throws when model is missing", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
      });

      expect(() => parseOpenMeteoQueryParams(params)).toThrow("Missing required parameter: model");
    });

    it("throws when invalid model ID", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "invalid_model",
      });

      expect(() => parseOpenMeteoQueryParams(params)).toThrow(
        "Invalid Open-Meteo model: invalid_model",
      );
    });
  });

  describe("error handling - validation", () => {
    it("throws when wind_min is negative", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "gfs_global",
        wind_min: "-1",
        wind_max: "20",
      });

      expect(() => parseOpenMeteoQueryParams(params)).toThrow(
        "wind_min must be a non-negative number",
      );
    });

    it("throws when wind_max <= wind_min", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "gfs_global",
        wind_min: "20",
        wind_max: "20",
      });

      expect(() => parseOpenMeteoQueryParams(params)).toThrow(
        "wind_max must be greater than wind_min",
      );
    });

    it("throws when wind_max < wind_min", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "gfs_global",
        wind_min: "25",
        wind_max: "20",
      });

      expect(() => parseOpenMeteoQueryParams(params)).toThrow(
        "wind_max must be greater than wind_min",
      );
    });

    it("throws when min_session_hours is negative", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "gfs_global",
        min_session_hours: "-1",
      });

      expect(() => parseOpenMeteoQueryParams(params)).toThrow(
        "min_session_hours must be a non-negative number",
      );
    });

    it("throws when wave_height_min is negative", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "gfs_global",
        wave_height_min: "-0.5",
      });

      expect(() => parseOpenMeteoQueryParams(params)).toThrow(
        "wave_height_min must be a non-negative number",
      );
    });

    it("throws when wind_min is NaN", () => {
      const params = new URLSearchParams({
        location: "tel-aviv",
        model: "gfs_global",
        wind_min: "abc",
        wind_max: "20",
      });

      expect(() => parseOpenMeteoQueryParams(params)).toThrow(
        "wind_min must be a non-negative number",
      );
    });
  });
});

describe("resolveOpenMeteoLocation", () => {
  describe("happy path", () => {
    it("resolves valid location with coordinates", () => {
      const location = resolveOpenMeteoLocation("tel-aviv");

      expect(location.label).toBeDefined();
      expect(location.tz).toBeDefined();
      expect(location.coordinates).toBeDefined();
      expect(location.coordinates.lat).toBeDefined();
      expect(location.coordinates.lon).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("throws for unknown location ID", () => {
      expect(() => resolveOpenMeteoLocation("unknown_location_xyz")).toThrow(
        "Unknown location: unknown_location_xyz",
      );
    });

    it("throws for location without coordinates", () => {
      expect(() => resolveOpenMeteoLocation("some_invalid_xyz")).toThrow(
        "Unknown location: some_invalid_xyz",
      );
    });
  });
});
