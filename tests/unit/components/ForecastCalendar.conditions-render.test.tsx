import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ForecastSession } from "../../../shared/forecast-types";
import { ForecastCalendar } from "../../../src/components/ForecastCalendar";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("ForecastCalendar", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders same-day sessions and conditions on a labeled hourly calendar", async () => {
    const weekStart = new Date(2026, 6, 27);
    const session: ForecastSession = {
      location: { id: "beit-yanai", label: "Beit Yanai" },
      start: new Date(2026, 6, 28, 9).toISOString(),
      end: new Date(2026, 6, 28, 12).toISOString(),
      matchType: "both",
      wind: { min: 12, max: 16, gustMax: 20, direction: "W" },
      wave: { avgHeight: 1.2, avgPeriod: 8, direction: "NW" },
      swell: { avgHeight: 0.8, avgPeriod: 7 },
      hourly: [],
    };
    const sessions = [
      session,
      {
        ...session,
        start: new Date(2026, 6, 28, 13).toISOString(),
        end: new Date(2026, 6, 28, 14).toISOString(),
        matchType: "wind" as const,
        wind: { ...session.wind, direction: "N" },
      },
      {
        ...session,
        start: new Date(2026, 6, 28, 15).toISOString(),
        end: new Date(2026, 6, 28, 16).toISOString(),
        matchType: "wind" as const,
        wind: { ...session.wind, direction: "S" },
      },
    ];

    await act(async () =>
      root.render(
        createElement(ForecastCalendar, {
          sessions,
          isPending: false,
          error: null,
          weekStart,
          canGoPrev: true,
          canGoNext: true,
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday: vi.fn(),
        }),
      ),
    );

    const windDirection = container.querySelector<HTMLElement>(
      '[role="img"][aria-label="Wind direction W"]',
    );
    const waveDirection = container.querySelector<HTMLElement>(
      '[role="img"][aria-label="Wave direction NW"]',
    );
    expect(windDirection?.textContent).toBe("►-W");
    expect(waveDirection?.textContent).toBe("≈►-NW");
    expect(container.querySelector('[aria-label="Wind direction N"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Wind direction S"]')).not.toBeNull();
    const combined = container.querySelector<HTMLButtonElement>(
      '[aria-label*="Wind 12–16 kn W, Wave 1.2m 8s NW"]',
    );
    expect(combined?.textContent).toContain("1.2m 8s");
    expect(combined?.textContent).toContain("12–16 kn");

    const calendar = container.querySelector(
      '[role="region"][aria-label="Weekly forecast calendar"]',
    );
    expect(calendar).not.toBeNull();
    expect(calendar?.textContent).toContain("06:00");
    expect(calendar?.textContent).toContain("20:00");
    expect(container.textContent).toContain("Local time ·");
    expect(calendar?.querySelectorAll('[aria-label*="at Beit Yanai"]')).toHaveLength(3);
  });
});
