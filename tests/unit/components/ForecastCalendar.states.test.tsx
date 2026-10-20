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

  it("renders seven empty days when the selected week has no sessions", async () => {
    await act(async () =>
      root.render(
        createElement(ForecastCalendar, {
          sessions: [],
          isPending: false,
          error: null,
          weekStart: new Date(2026, 6, 26),
          canGoPrev: false,
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday: vi.fn(),
        }),
      ),
    );

    expect(container.querySelectorAll('[aria-label$=": No sessions"]')).toHaveLength(7);
    expect(container.textContent).not.toContain("No sessions match your filters this week");
    const previous = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Prev"),
    )!;
    expect(previous.disabled).toBe(true);
  });

  it("shows only wave conditions for a wave match, including zero period and matching wind speeds", async () => {
    const sessions: ForecastSession[] = [
      {
        location: { id: "herzliya", label: "Herzliya" },
        start: new Date(2026, 6, 30, 8).toISOString(),
        end: new Date(2026, 6, 30, 11).toISOString(),
        matchType: "wave",
        wind: { min: 12, max: 12, gustMax: 15, direction: "N" },
        wave: { avgHeight: 1.4, avgPeriod: 0, direction: "SW" },
        swell: { avgHeight: 1, avgPeriod: 7 },
        hourly: [],
      },
    ];
    const props = {
      sessions,
      isPending: false,
      error: null,
      weekStart: new Date(2026, 6, 26),
      canGoPrev: false,
      onPrev: vi.fn(),
      onNext: vi.fn(),
      onToday: vi.fn(),
    };
    await act(async () => root.render(createElement(ForecastCalendar, props)));
    const event = container.querySelector('[aria-label*="at Herzliya"]')!;
    expect(event.getAttribute("aria-label")).toBe(
      "THU Jul 30 at Herzliya: 08:00 – 11:00, Wave 1.4m SW",
    );
    expect(event.textContent).toContain("1.4m");
    expect(event.textContent).not.toContain("0s");
    expect(event.textContent).not.toContain("kn");
    expect(event.querySelector('[aria-label="Wave direction SW"]')).not.toBeNull();
    expect(event.querySelector('[aria-label^="Wind direction"]')).toBeNull();
    await act(async () =>
      root.render(
        createElement(ForecastCalendar, {
          ...props,
          sessions: [{ ...sessions[0], matchType: "wind" }],
        }),
      ),
    );
    expect(container.querySelector('[aria-label*="at Herzliya"]')?.textContent).toContain("12 kn");
  });
});
