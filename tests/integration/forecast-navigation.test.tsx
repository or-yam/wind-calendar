import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ForecastSession } from "../../shared/forecast-types";
import { useWeekNavigation } from "../../src/hooks/useWeekNavigation";
import { ForecastCalendar } from "../../src/components/ForecastCalendar";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let navigation: ReturnType<typeof useWeekNavigation>;

const NO_SESSIONS: ForecastSession[] = [];

function Harness({ sessions = NO_SESSIONS }: { sessions?: ForecastSession[] }) {
  navigation = useWeekNavigation("default");
  const [mode, setMode] = useState<"three-days" | "day">("three-days");
  return createElement(ForecastCalendar, {
    sessions,
    isPending: false,
    error: null,
    weekStart: navigation.weekStart,
    today: navigation.today,
    canGoPrev: navigation.canGoPrev,
    onPrev: navigation.goToPrev,
    onNext: navigation.goToNext,
    onToday: navigation.goToToday,
    mode,
    onModeChange: setMode,
    resetKey: "default",
  });
}

function session(day: number, hour: number): ForecastSession {
  const start = new Date(2026, 6, day, hour);
  return {
    location: { id: "beit-yanai", label: "Beit Yanai" },
    start: start.toISOString(),
    end: new Date(2026, 6, day, hour + 2).toISOString(),
    matchType: "wind",
    wind: { min: 16, max: 20, gustMax: 23, direction: "W" },
    wave: { avgHeight: 1.2, avgPeriod: 8, direction: "NW" },
    swell: { avgHeight: 0.8, avgPeriod: 7 },
    hourly: [],
  };
}

describe("forecast navigation with rendered calendar", () => {
  let container: HTMLDivElement;
  let root: Root;

  const todayButton = () =>
    [...container.querySelectorAll("button")].find((b) => b.textContent === "Today")!;
  const nextButton = () =>
    [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("Next"))!;
  const todayCard = () => container.querySelector<HTMLElement>('[data-today="true"]');
  const weekLabel = () =>
    container.querySelector('nav[aria-label="Week navigation"] .week-range')?.textContent;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 29, 12));
    localStorage.clear();
    HTMLElement.prototype.scrollTo = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows three selectable days on mobile and lets the reader switch to one day", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(max-width: 767px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await act(async () => root.render(createElement(Harness)));

    expect(
      container.querySelector('[role="region"]')!.querySelectorAll('[role="group"]'),
    ).toHaveLength(3);
    const friday = [...container.querySelectorAll("button")].find((button) =>
      button.getAttribute("aria-label")?.includes("FRI Jul 31"),
    );
    expect(friday).toBeDefined();
    await act(async () => friday!.click());
    expect(
      container.querySelector('[role="region"]')!.querySelectorAll('[role="group"]'),
    ).toHaveLength(3);

    const dayMode = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Day",
    );
    expect(dayMode).toBeDefined();
    await act(async () => dayMode!.click());
    expect(
      container.querySelector('[role="region"]')!.querySelectorAll('[role="group"]'),
    ).toHaveLength(1);
    expect(container.querySelector('[role="group"][aria-label*="FRI Jul 31"]')).not.toBeNull();
  });

  it("moves backward within the current week and stops at Sunday", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(max-width: 767px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await act(async () => root.render(createElement(Harness)));
    const previous = () =>
      container.querySelector<HTMLButtonElement>('button[aria-label="Previous range"]')!;

    expect(previous().disabled).toBe(false);
    await act(async () => previous().click());

    expect(weekLabel()).toBe("Jul 26 – Aug 1, 2026");
    expect(
      container.querySelector('[role="region"] [role="group"]')?.getAttribute("aria-label"),
    ).toContain("SUN Jul 26");
    expect(previous().disabled).toBe(true);
  });

  it("advances mobile ranges and enters the next week at its Sunday boundary", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(max-width: 767px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await act(async () => root.render(createElement(Harness)));
    const next = () =>
      container.querySelector<HTMLButtonElement>('button[aria-label="Next range"]')!;

    await act(async () => next().click());
    expect(
      container.querySelector('[role="region"]')!.querySelectorAll('[role="group"]'),
    ).toHaveLength(3);
    await act(async () => next().click());

    expect(weekLabel()).toBe("Aug 2 – 8, 2026");
    expect(
      container.querySelector('[role="region"] [role="group"]')?.getAttribute("aria-label"),
    ).toContain("SUN Aug 2");
  });

  it("focuses today's day when returning from a future week with no sessions", async () => {
    await act(async () => root.render(createElement(Harness)));

    const next = nextButton();
    next.focus();
    await act(async () => next.click());
    expect(weekLabel()).toBe("Aug 2 – 8, 2026");

    const today = todayButton();
    today.focus();
    await act(async () => today.click());

    expect(weekLabel()).toBe("Jul 26 – Aug 1, 2026");
    expect(document.activeElement).toBe(todayCard());
    expect(todayCard()?.getAttribute("aria-label")).toBe("WED Jul 29: No sessions");
  });

  it("focuses today's day when returning from a future week with sessions", async () => {
    await act(async () =>
      root.render(createElement(Harness, { sessions: [session(29, 9), session(29, 14)] })),
    );

    const next = nextButton();
    await act(async () => next.click());
    const today = todayButton();
    await act(async () => today.click());

    expect(document.activeElement).toBe(todayCard());
    expect(todayCard()?.getAttribute("aria-label")).toBe("WED Jul 29");
    expect(todayCard()?.textContent).toContain("09:00 – 11:00");
  });

  it("focuses today's day when Today is pressed while already on the current week", async () => {
    await act(async () => root.render(createElement(Harness)));

    const today = todayButton();
    today.focus();
    await act(async () => today.click());

    expect(document.activeElement).toBe(todayCard());
  });

  it("does not move focus when navigating weeks without pressing Today", async () => {
    await act(async () => root.render(createElement(Harness)));

    const next = nextButton();
    next.focus();
    await act(async () => next.click());

    expect(document.activeElement).toBe(next);
  });

  it("does not move focus when a new forecast arrives", async () => {
    await act(async () => root.render(createElement(Harness)));

    const next = nextButton();
    next.focus();
    await act(async () => root.render(createElement(Harness, { sessions: [session(29, 9)] })));

    expect(document.activeElement).toBe(next);
  });

  it("highlights the new day when midnight passes inside the same week", async () => {
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
    await act(async () => root.render(createElement(Harness)));
    expect(todayCard()?.getAttribute("aria-label")).toBe("THU Dec 31: No sessions");

    await act(async () => vi.advanceTimersByTime(1000));

    expect(weekLabel()).toBe("Dec 27, 2026 – Jan 2, 2027");
    expect(todayCard()?.getAttribute("aria-label")).toBe("FRI Jan 1: No sessions");
  });

  it("highlights the new day when resuming the tab inside the same week", async () => {
    vi.setSystemTime(new Date(2026, 2, 26, 12));
    await act(async () => root.render(createElement(Harness)));
    expect(todayCard()?.getAttribute("aria-label")).toBe("THU Mar 26: No sessions");

    vi.setSystemTime(new Date(2026, 2, 27, 12));
    await act(async () => window.dispatchEvent(new Event("focus")));

    expect(weekLabel()).toBe("Mar 22 – 28, 2026");
    expect(todayCard()?.getAttribute("aria-label")).toBe("FRI Mar 27: No sessions");
  });

  it("does not steal focus or scroll horizontally when the day changes", async () => {
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
    await act(async () => root.render(createElement(Harness)));

    const next = nextButton();
    next.focus();
    vi.mocked(HTMLElement.prototype.scrollTo).mockClear();
    await act(async () => vi.advanceTimersByTime(1000));

    expect(document.activeElement).toBe(next);
    expect(HTMLElement.prototype.scrollTo).not.toHaveBeenCalled();
  });

  it("keeps a selected future week across a Sunday rollover", async () => {
    vi.setSystemTime(new Date(2026, 7, 1, 23, 59, 59));
    await act(async () => root.render(createElement(Harness)));

    const next = nextButton();
    await act(async () => next.click());
    await act(async () => next.click());
    expect(weekLabel()).toBe("Aug 9 – 15, 2026");

    await act(async () => vi.advanceTimersByTime(1000));

    expect(weekLabel()).toBe("Aug 9 – 15, 2026");
    expect(todayCard()).toBeNull();
  });
});
