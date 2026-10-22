import { act } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createCalendarApp } from "../helpers/calendar-app-render";

let app: ReturnType<typeof createCalendarApp>;
beforeEach(() => {
  app = createCalendarApp();
});
afterEach(() => app.cleanup());

it.each([
  { mode: "Day", futureWeek: false },
  { mode: "Day", futureWeek: true },
  { mode: "3 days", futureWeek: false },
  { mode: "3 days", futureWeek: true },
])(
  "Today restores the selected date and visible range in $mode (future week: $futureWeek)",
  async ({ mode, futureWeek }) => {
    await app.render();
    await act(async () => app.button(mode).click());
    await act(async () => app.button("SAT Aug 1").click());
    if (futureWeek) {
      await act(async () => app.button("Next range").click());
      await act(async () => app.button("FRI Aug 7").click());
    }
    await act(async () => app.button("Today").click());
    expect(app.selectedDay()).toBe("WED Jul 29");
    expect(app.visibleDays()).toEqual(
      mode === "Day" ? ["WED Jul 29"] : ["WED Jul 29", "THU Jul 30", "FRI Jul 31"],
    );
    expect(app.button(mode).getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement?.getAttribute("aria-label")).toBe("WED Jul 29: No sessions");
  },
);

it.each([false, true])(
  "filter reset restores today while preserving Day preference (future week: %s)",
  async (futureWeek) => {
    await app.render();
    await act(async () => app.button("Day").click());
    const originalUrl = window.location.href;
    if (futureWeek) {
      await act(async () => app.button("SAT Aug 1").click());
      await act(async () => app.button("Next range").click());
      await act(async () => app.button("FRI Aug 7").click());
      expect(app.visibleDays()).toEqual(["FRI Aug 7"]);
    } else {
      await act(async () => app.button("FRI Jul 31").click());
      expect(app.visibleDays()).toEqual(["FRI Jul 31"]);
    }
    await app.editFilter();
    expect(new URLSearchParams(window.location.search).get("waveHeightMin")).toBe("0.6");
    expect(app.selectedDay()).toBe("WED Jul 29");
    expect(app.visibleDays()).toEqual(["WED Jul 29"]);
    expect(app.button("Day").getAttribute("aria-pressed")).toBe("true");
    expect(app.forecastCalls.at(-1)!.get("waveHeightMin")).toBe("0.6");

    await act(async () => {
      window.history.replaceState(null, "", originalUrl);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(app.button("Day").getAttribute("aria-pressed")).toBe("true");
    expect(app.visibleDays()).toEqual(["WED Jul 29"]);
  },
);
