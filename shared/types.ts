import type { CalendarConfig } from "./calendar-config-schema";

export type WaveSource = "total" | "swell";
export type { CalendarConfig } from "./calendar-config-schema";

export interface InterpretConfigResponse {
  outcome: "configured" | "insufficient" | "unsupported";
  message: string;
  config: CalendarConfig;
}

export interface LocationConfig {
  spotId: string;
  tz: string;
  label: string;
  models: number[];
  coordinates?: { lat: number; lon: number };
}
