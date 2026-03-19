import { interpolateStops } from "./wind-colors";

const WAVE_HEIGHT_STOPS: [number, string][] = [
  [0, "#FFFFFF"],
  [0.3, "#FFFFFF"],
  [3, "#7A83FF"],
  [4.95, "#AD5AC9"],
  [7.95, "#FF5064"],
  [15, "#FFC864"],
];

const WAVE_PERIOD_STOPS: [number, string][] = [
  [0, "#FFFFFF"],
  [10, "#FFFFFF"],
  [20, "#FC5151"],
];

export function waveHeightColor(meters: number): string {
  return interpolateStops(WAVE_HEIGHT_STOPS, meters);
}

export function waveHeightTextColor(meters: number): string {
  return meters <= 1 ? "#0B1220" : "#E5E7EB";
}

export function wavePeriodColor(seconds: number): string {
  return interpolateStops(WAVE_PERIOD_STOPS, seconds);
}
