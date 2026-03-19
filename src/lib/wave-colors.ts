import { interpolateStops } from "./wind-colors";
import { TEXT_DARK, TEXT_LIGHT } from "./theme-colors";

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

const WAVE_HEIGHT_TEXT_THRESHOLD_M = 1; // meters - below this, use dark text
const WAVE_PERIOD_TEXT_THRESHOLD_S = 10; // seconds - below this, use dark text

export function waveHeightColor(meters: number): string {
  return interpolateStops(WAVE_HEIGHT_STOPS, meters);
}

export function waveHeightTextColor(meters: number): string {
  return meters <= WAVE_HEIGHT_TEXT_THRESHOLD_M ? TEXT_DARK : TEXT_LIGHT;
}

export function wavePeriodColor(seconds: number): string {
  return interpolateStops(WAVE_PERIOD_STOPS, seconds);
}

export function wavePeriodTextColor(seconds: number): string {
  return seconds <= WAVE_PERIOD_TEXT_THRESHOLD_S ? TEXT_DARK : TEXT_LIGHT;
}
