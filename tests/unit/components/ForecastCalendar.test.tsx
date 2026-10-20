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
    const previous = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "← Prev",
    )!;
    expect(previous.disabled).toBe(true);
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
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday: vi.fn(),
        }),
      ),
    );

    const windDirection = container.querySelector<HTMLElement>(
      '[role="img"][aria-label="Wind direction W"]',
    );
    const windArrow = windDirection?.querySelector<HTMLElement>("span");
    const waveDirection = container.querySelector<HTMLElement>(
      '[role="img"][aria-label="Wave direction NW"]',
    );
    const waveArrow = waveDirection?.querySelector<HTMLElement>("span:nth-child(2)");
    expect(windDirection?.textContent).toBe("►-W");
    expect(windArrow?.style.transform).toBe("rotate(0deg)");
    expect(waveDirection?.textContent).toBe("≈►-NW");
    expect(waveArrow?.style.transform).toBe("rotate(45deg)");
    expect(
      container.querySelector<HTMLElement>('[aria-label="Wind direction N"] span')?.style.transform,
    ).toBe("rotate(90deg)");
    expect(
      container.querySelector<HTMLElement>('[aria-label="Wind direction S"] span')?.style.transform,
    ).toBe("rotate(270deg)");

    const badges = [...container.querySelectorAll("span.rounded")].map(
      (badge) => badge.textContent,
    );
    expect(badges).toContain("1.2m 8s");
    expect(badges).toContain("12–16 kn");
    expect(
      container.querySelector('[aria-label*="Wind 12–16 kn W, Wave 1.2m 8s NW"]'),
    ).not.toBeNull();

    const calendar = container.querySelector(
      '[role="region"][aria-label="Weekly forecast calendar"]',
    );
    expect(calendar).not.toBeNull();
    expect(calendar?.textContent).toContain("06:00");
    expect(calendar?.textContent).toContain("20:00");
    expect(container.textContent).toContain("Local time ·");
    expect(calendar?.querySelectorAll('[aria-label*="at Beit Yanai"]')).toHaveLength(3);
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

  it("lets phone readers select one day without squeezing the week into columns", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    await act(async () =>
      root.render(
        createElement(ForecastCalendar, {
          sessions: [],
          isPending: false,
          error: null,
          weekStart: new Date(2026, 6, 26),
          today: new Date(2026, 6, 29),
          canGoPrev: false,
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday: vi.fn(),
        }),
      ),
    );
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Select day"]');
    expect(select).not.toBeNull();
    expect(select?.selectedOptions[0].textContent).toBe("WED Jul 29");
    expect(container.querySelectorAll('[aria-label$=": No sessions"]')).toHaveLength(1);
    await act(async () => {
      select!.value = "5";
      select!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(
      container.querySelector('[aria-label$=": No sessions"]')?.getAttribute("aria-label"),
    ).toBe("FRI Jul 31: No sessions");
    vi.unstubAllGlobals();
  });

  it("switches between the week and the phone day view when the window is resized", async () => {
    let narrow = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        get matches() {
          return narrow;
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    await act(async () =>
      root.render(
        createElement(ForecastCalendar, {
          sessions: [],
          isPending: false,
          error: null,
          weekStart: new Date(2026, 6, 26),
          today: new Date(2026, 6, 29),
          canGoPrev: false,
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday: vi.fn(),
        }),
      ),
    );
    expect(container.querySelectorAll('[aria-label$=": No sessions"]')).toHaveLength(7);
    narrow = true;
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(container.querySelectorAll('[aria-label$=": No sessions"]')).toHaveLength(1);
    narrow = false;
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(container.querySelectorAll('[aria-label$=": No sessions"]')).toHaveLength(7);
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
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday: vi.fn(),
        }),
      ),
    );
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "No sessions match this day",
    );
  });

  it("focuses today without horizontal scrolling when Today is clicked", async () => {
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
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday,
        }),
      ),
    );
    const today = container.querySelector<HTMLElement>("[data-today='true']")!;
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

  it("does not focus or scroll when the day changes without user interaction", async () => {
    const weekStart = new Date(2026, 11, 27);
    const noSessions: ForecastSession[] = [];
    const renderCards = (today: Date) =>
      createElement(ForecastCalendar, {
        sessions: noSessions,
        isPending: false,
        error: null,
        weekStart,
        today,
        canGoPrev: false,
        onPrev: vi.fn(),
        onNext: vi.fn(),
        onToday: vi.fn(),
      });

    await act(async () => root.render(renderCards(new Date(2026, 11, 31))));
    vi.mocked(HTMLElement.prototype.scrollTo).mockClear();

    await act(async () => root.render(renderCards(new Date(2027, 0, 1))));

    expect(container.querySelector("[data-today='true']")?.getAttribute("aria-label")).toBe(
      "FRI Jan 1: No sessions",
    );
    expect(HTMLElement.prototype.scrollTo).not.toHaveBeenCalled();
  });
});
