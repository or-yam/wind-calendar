import { interpolateStops } from "./wind-colors";
import { TEXT_DARK } from "./theme-colors";

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

export function waveHeightTextColor(_meters: number): string {
  return TEXT_DARK;
}

export function wavePeriodColor(seconds: number): string {
  return interpolateStops(WAVE_PERIOD_STOPS, seconds);
}

export function wavePeriodTextColor(_seconds: number): string {
  return TEXT_DARK;
}
