import { Effect } from "effect";
import { ProviderDataError } from "../errors.js";
import type { DaylightInterval } from "../types/wind-conditions.js";
import type { OpenMeteoForecastResponse } from "./types.js";
import { parseOpenMeteoTimestamp } from "./timestamp.js";

function validLabel(label: string, dateOnly = false): boolean {
  if (typeof label !== "string") return false;
  const pattern = dateOnly ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;
  if (!pattern.test(label)) return false;
  const parsed = new Date(dateOnly ? label + "T00:00Z" : label + "Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, label.length) === label;
}

export function extractDaylight(
  forecast: OpenMeteoForecastResponse,
): Effect.Effect<DaylightInterval[], ProviderDataError> {
  return Effect.try({
    try: () => {
      const { daily, utc_offset_seconds: offset } = forecast;
      if (!daily?.sunrise?.length || !daily?.sunset?.length) {
        throw new Error("Missing sunrise/sunset data in forecast response");
      }
      const invalid = () => {
        throw new Error("Invalid or incomplete daylight data in forecast response");
      };
      if (
        !Number.isFinite(offset) ||
        !Array.isArray(daily.time) ||
        !Array.isArray(daily.sunrise) ||
        !Array.isArray(daily.sunset) ||
        daily.time.length !== daily.sunrise.length ||
        daily.time.length !== daily.sunset.length
      )
        invalid();
      const dates = new Set<string>();
      const intervals = daily.time
        .map((day, index) => {
          const start = daily.sunrise[index];
          const end = daily.sunset[index];
          if (!validLabel(day, true) || dates.has(day) || !validLabel(start) || !validLabel(end))
            invalid();
          if (start.slice(0, 10) !== day || end.slice(0, 10) !== day) invalid();
          dates.add(day);
          const sunrise = parseOpenMeteoTimestamp(start, offset);
          const sunset = parseOpenMeteoTimestamp(end, offset);
          if (
            !Number.isFinite(sunrise.getTime()) ||
            !Number.isFinite(sunset.getTime()) ||
            sunrise >= sunset
          )
            invalid();
          return { sunrise, sunset };
        })
        .sort((a, b) => a.sunrise.getTime() - b.sunrise.getTime());
      for (let index = 1; index < intervals.length; index++) {
        if (intervals[index].sunrise < intervals[index - 1].sunset) invalid();
      }
      if (!Array.isArray(forecast.hourly?.time)) invalid();
      for (const label of forecast.hourly.time) {
        if (!validLabel(label) || !dates.has(label.slice(0, 10))) invalid();
      }
      return intervals;
    },
    catch: (error) =>
      new ProviderDataError({
        message: error instanceof Error ? error.message : "Invalid daylight data",
      }),
  });
}
