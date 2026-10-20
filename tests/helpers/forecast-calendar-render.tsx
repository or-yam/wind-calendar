import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { ForecastSession } from "../../shared/forecast-types";
import { ForecastCalendar } from "../../src/components/ForecastCalendar";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

export const makeSession = (id: string, start: number, end: number): ForecastSession => ({
  location: { id, label: id },
  start: new Date(2026, 9, 23, start).toISOString(),
  end: new Date(2026, 9, 23, end).toISOString(),
  matchType: "both",
  wind: { min: 18, max: 24, gustMax: 30, direction: "W" },
  wave: { avgHeight: 1.2, avgPeriod: 8, direction: "NW" },
  swell: { avgHeight: 0.8, avgPeriod: 7 },
  hourly: [],
});

const defaults = {
  isPending: false,
  error: null,
  weekStart: new Date(2026, 9, 18),
  today: new Date(2026, 9, 20),
  canGoPrev: false,
  onPrev: () => {},
  onNext: () => {},
  onToday: () => {},
};

type Overrides = Partial<Parameters<typeof ForecastCalendar>[0]>;

export function createCalendarHarness() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  return {
    container,
    async render(sessions: ForecastSession[], overrides: Overrides = {}) {
      await act(async () =>
        root.render(createElement(ForecastCalendar, { ...defaults, ...overrides, sessions })),
      );
    },
    event(id: string) {
      return container.querySelector<HTMLElement>(`[aria-label*="at ${id}:"]`)!;
    },
    cleanup() {
      act(() => root.unmount());
      container.remove();
    },
  };
}
