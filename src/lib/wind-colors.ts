type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0").toUpperCase()).join("")
  );
}

function interpolateRgbStops(stops: [number, Rgb][], value: number): string {
  if (value <= stops[0][0]) {
    const [r, g, b] = stops[0][1];
    return rgbToHex(r, g, b);
  }
  if (value >= stops[stops.length - 1][0]) {
    const [r, g, b] = stops[stops.length - 1][1];
    return rgbToHex(r, g, b);
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, rgb0] = stops[i];
    const [v1, rgb1] = stops[i + 1];
    if (value >= v0 && value <= v1) {
      const t = (value - v0) / (v1 - v0);
      const [r0, g0, b0] = rgb0;
      const [r1, g1, b1] = rgb1;
      return rgbToHex(r0 + t * (r1 - r0), g0 + t * (g1 - g0), b0 + t * (b1 - b0));
    }
  }

  const [r, g, b] = stops[stops.length - 1][1];
  return rgbToHex(r, g, b);
}

export function interpolateStops(stops: [number, string][], value: number): string {
  const rgbStops: [number, Rgb][] = stops.map(([v, hex]) => [v, hexToRgb(hex)]);
  return interpolateRgbStops(rgbStops, value);
}

const WIND_STOPS: [number, string][] = [
  [0, "#FFFFFF"], // white
  [4.9, "#FFFFFF"], // white (holds until ~5kn)
  [9.1, "#67F7F1"], // cyan
  [13.3, "#00FF00"], // green
  [18.9, "#FFF000"], // yellow
  [24.5, "#FF322C"], // red
  [31.5, "#FF0AC8"], // pink
  [37.8, "#FF00FF"], // magenta
  [44.8, "#9632FF"], // purple
  [60.2, "#3C3CFF"], // blue
  [70, "#0000FF"], // deep blue
];

const WIND_STOPS_RGB: [number, Rgb][] = WIND_STOPS.map(([k, hex]) => [k, hexToRgb(hex)]);

export function windColor(knots: number): string {
  return interpolateRgbStops(WIND_STOPS_RGB, knots);
}

import { TEXT_DARK, TEXT_LIGHT } from "./theme-colors";

const WIND_TEXT_THRESHOLD_KN = 20; // knots - below this, use dark text

export function windTextColor(knots: number): string {
  return knots <= WIND_TEXT_THRESHOLD_KN ? TEXT_DARK : TEXT_LIGHT;
}
