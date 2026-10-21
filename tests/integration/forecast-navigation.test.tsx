import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ForecastSession } from "../../shared/forecast-types";
import { useWeekNavigation } from "../../src/hooks/useWeekNavigation";
import { ForecastCalendar } from "../../src/components/ForecastCalendar";
import { calendarControls } from "../helpers/calendar-controls";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let navigation: ReturnType<typeof useWeekNavigation>;

const NO_SESSIONS: ForecastSession[] = [];

function Harness({ sessions = NO_SESSIONS }: { sessions?: ForecastSession[] }) {
  navigation = useWeekNavigation("default");
  return createElement(ForecastCalendar, {
    sessions,
    isPending: false,
    error: null,
    weekStart: navigation.weekStart,
    today: navigation.today,
    canGoPrev: navigation.canGoPrev,
    canGoNext: navigation.canGoNext,
    onPrev: navigation.goToPrev,
    onNext: navigation.goToNext,
    onToday: navigation.goToToday,
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

  it.each([
    {
      mode: "Day",
      current: ["SAT Aug 1"],
      next: ["SUN Aug 2"],
      previous: ["SAT Aug 1"],
      selected: "SAT Aug 1",
    },
    {
      mode: "3 days",
      current: ["THU Jul 30", "FRI Jul 31", "SAT Aug 1"],
      next: ["SUN Aug 2", "MON Aug 3", "TUE Aug 4"],
      previous: ["THU Jul 30", "FRI Jul 31", "SAT Aug 1"],
      selected: "SAT Aug 1",
    },
  ])(
    "crosses both week boundaries with the correct dates in $mode mode",
    async ({ mode, current, next, previous, selected }) => {
      vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn() }));
      await act(async () => root.render(createElement(Harness)));
      const controls = calendarControls(container);
      await act(async () => controls.button(mode).click());
      await act(async () => controls.button("SAT Aug 1").click());
      expect(controls.visibleDays()).toEqual(current);
      await act(async () => controls.button("Next range").click());
      expect(weekLabel()).toBe("Aug 2 – 8, 2026");
      expect(controls.selectedDay()).toBe("SUN Aug 2");
      expect(controls.visibleDays()).toEqual(next);
      await act(async () => controls.button("Previous range").click());
      expect(weekLabel()).toBe("Jul 26 – Aug 1, 2026");
      expect(controls.selectedDay()).toBe(selected);
      expect(controls.visibleDays()).toEqual(previous);
    },
  );

  it("moves backward within the current week and stops at Sunday", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn() }));
    await act(async () => root.render(createElement(Harness)));
    const controls = calendarControls(container);
    expect(controls.visibleDays()).toEqual(["WED Jul 29", "THU Jul 30", "FRI Jul 31"]);
    await act(async () => controls.button("Previous range").click());
    expect(controls.visibleDays()).toEqual(["SUN Jul 26", "MON Jul 27", "TUE Jul 28"]);
    expect(controls.selectedDay()).toBe("SUN Jul 26");
    expect(controls.button("Previous range").disabled).toBe(true);
    await act(async () => controls.button("Previous range").click());
    expect(controls.visibleDays()).toEqual(["SUN Jul 26", "MON Jul 27", "TUE Jul 28"]);
  });

  it("disables desktop Next after advancing two weeks and restores it on Today", async () => {
    await act(async () => root.render(createElement(Harness)));
    await act(async () => nextButton().click());
    expect(nextButton().disabled).toBe(false);
    await act(async () => nextButton().click());
    expect(weekLabel()).toBe("Aug 9 – 15, 2026");
    expect(nextButton().disabled).toBe(true);
    await act(async () => nextButton().click());
    expect(weekLabel()).toBe("Aug 9 – 15, 2026");
    await act(async () => todayButton().click());
    expect(nextButton().disabled).toBe(false);
  });

  it.each(["Day", "3 days"])("caps mobile %s navigation at the final range", async (mode) => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(max-width: 767px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await act(async () => root.render(createElement(Harness)));
    if (mode === "Day") {
      const dayButton = [...container.querySelectorAll("button")].find(
        (b) => b.textContent === "Day",
      )!;
      await act(async () => dayButton.click());
    }
    for (let i = 0; i < 25 && !nextButton().disabled; i++) {
      await act(async () => nextButton().click());
    }
    expect(weekLabel()).toBe("Aug 9 – 15, 2026");
    expect(nextButton().disabled).toBe(true);
    const controls = calendarControls(container);
    const finalDays = mode === "Day" ? ["SAT Aug 15"] : ["THU Aug 13", "FRI Aug 14", "SAT Aug 15"];
    expect(controls.visibleDays()).toEqual(finalDays);
    await act(async () => nextButton().click());
    expect(weekLabel()).toBe("Aug 9 – 15, 2026");
    expect(controls.visibleDays()).toEqual(finalDays);
    const previous = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Previous range"]',
    )!;
    await act(async () => previous.click());
    expect(nextButton().disabled).toBe(false);
  });

  it("moves backward by three days from the clamped Saturday range", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(max-width: 767px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await act(async () => root.render(createElement(Harness)));
    const saturday = container.querySelector<HTMLButtonElement>('button[aria-label="SAT Aug 1"]')!;
    await act(async () => saturday.click());
    expect(
      container.querySelector('[role="region"] [role="group"]')?.getAttribute("aria-label"),
    ).toContain("THU Jul 30");
    const previous = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Previous range"]',
    )!;
    await act(async () => previous.click());
    const controls = calendarControls(container);
    expect(controls.visibleDays()).toEqual(["MON Jul 27", "TUE Jul 28", "WED Jul 29"]);
    expect(controls.selectedDay()).toBe("MON Jul 27");
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

  it("preserves navigation focus without scrolling on day rollover", async () => {
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
