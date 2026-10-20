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

  it("focuses today without scrolling the page when Today is clicked", async () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const session: ForecastSession = {
      location: { id: "beit-yanai", label: "Beit Yanai" },
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9).toISOString(),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString(),
      matchType: "wind",
      wind: { min: 12, max: 16, gustMax: 20, direction: "W" },
      wave: { avgHeight: 1.2, avgPeriod: 8, direction: "NW" },
      swell: { avgHeight: 0.8, avgPeriod: 7 },
      hourly: [],
    };
    const onToday = vi.fn();

    await act(async () =>
      root.render(
        createElement(ForecastCalendar, {
          sessions: [session],
          isPending: false,
          error: null,
          weekStart,
          canGoPrev: false,
          canGoNext: true,
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday,
        }),
      ),
    );
    const weekday = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const month = now.toLocaleDateString("en-US", { month: "short" });
    const today = container.querySelector<HTMLElement>(
      `[role="group"][aria-label="${weekday} ${month} ${now.getDate()}"]`,
    )!;
    const todayButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Today",
    )!;
    // Focus is applied after the parent commits the current week, so re-render
    // the way the real caller does before asserting focus.
    await act(async () => {
      todayButton.click();
      root.render(
        createElement(ForecastCalendar, {
          sessions: [session],
          isPending: false,
          error: null,
          weekStart,
          canGoPrev: false,
          canGoNext: true,
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday,
        }),
      );
    });

    expect(onToday).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(today);
    expect(HTMLElement.prototype.scrollTo).not.toHaveBeenCalled();
  });
});
