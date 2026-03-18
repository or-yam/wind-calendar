# Phase 3 — Color System

> **Goal:** Align wind/wave colors with Windguru's actual color ranges.
> **Estimated scope:** 2 files (1 modified, 1 new)

## 3.1 Update wind color stops

**File:** `src/lib/wind-colors.ts` (modified)

Replace the current `STOPS` array with the actual Windguru gradient values
(see `reference-windguru-colors.md` for full comparison).

The interpolation logic (`hexToRgb`, `rgbToHex`, linear interpolation loop) stays the same.
Only the stop values change. Also update the upper bound from 60 to 70.

Export the interpolation helper for reuse:

```typescript
export function interpolateStops(stops: [number, string][], value: number): string {
  if (value <= stops[0][0]) return stops[0][1];
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];

  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, hex0] = stops[i];
    const [v1, hex1] = stops[i + 1];
    if (value >= v0 && value <= v1) {
      const t = (value - v0) / (v1 - v0);
      const [r0, g0, b0] = hexToRgb(hex0);
      const [r1, g1, b1] = hexToRgb(hex1);
      return rgbToHex(r0 + t * (r1 - r0), g0 + t * (g1 - g0), b0 + t * (b1 - b0));
    }
  }

  return stops[stops.length - 1][1];
}

export const WIND_STOPS: [number, string][] = [
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

export function windColor(knots: number): string {
  return interpolateStops(WIND_STOPS, knots);
}

export function windTextColor(knots: number): string {
  return knots <= 20 ? "#0B1220" : "#E5E7EB";
}
```

**Verify:**

- [ ] `pnpm check` passes
- [ ] Visual comparison with Windguru — use `agent-browser`:

  ```bash
  # Screenshot our app
  agent-browser open http://localhost:5173 && agent-browser wait --load networkidle
  agent-browser screenshot screenshots/phase3-wind-colors.png

  # Screenshot Windguru for comparison
  agent-browser open https://www.windguru.cz/771 && agent-browser wait --load networkidle
  agent-browser screenshot screenshots/windguru-reference.png
  ```

  Spot-check: 15kn ~green, 20kn ~yellow, 25kn ~red

## 3.2 Add wave color functions

**File:** `src/lib/wave-colors.ts` (new)

```typescript
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
```

**Verify:**

- [ ] `pnpm check` passes
