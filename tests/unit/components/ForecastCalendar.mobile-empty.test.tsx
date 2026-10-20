import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("announces an empty selected phone day even when another day has sessions", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    await act(async () =>
      root.render(
        createElement(ForecastCalendar, {
          sessions: [
            {
              location: { id: "beit-yanai", label: "Beit Yanai" },
              start: new Date(2026, 6, 30, 9).toISOString(),
              end: new Date(2026, 6, 30, 12).toISOString(),
              matchType: "wind",
              wind: { min: 18, max: 24, gustMax: 28, direction: "W" },
              wave: { avgHeight: 1.2, avgPeriod: 8, direction: "NW" },
              swell: { avgHeight: 1, avgPeriod: 7 },
              hourly: [],
            },
          ],
          isPending: false,
          error: null,
          weekStart: new Date(2026, 6, 26),
          today: new Date(2026, 6, 29),
          canGoPrev: false,
          canGoNext: true,
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday: vi.fn(),
        }),
      ),
    );
    const dayMode = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Day",
    )!;
    await act(async () => dayMode.click());
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "No sessions match this day",
    );
  });
});
