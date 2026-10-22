import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCalendarHarness } from "../../helpers/forecast-calendar-render";
import { calendarControls } from "../../helpers/calendar-controls";
import { stubViewport } from "../../helpers/viewport";

let calendar: ReturnType<typeof createCalendarHarness>;
beforeEach(() => {
  calendar = createCalendarHarness();
});
afterEach(() => {
  calendar.cleanup();
  vi.unstubAllGlobals();
});

it("preserves Saturday through clamped ranges, mode changes, and desktop/mobile resizing", async () => {
  const resize = stubViewport(767);
  const controls = calendarControls(calendar.container);
  await calendar.render([]);
  expect(controls.visibleDays()).toEqual(["TUE Oct 20", "WED Oct 21", "THU Oct 22"]);

  await act(async () => controls.button("SAT Oct 24").click());
  expect(controls.selectedDay()).toBe("SAT Oct 24");
  expect(controls.visibleDays()).toEqual(["THU Oct 22", "FRI Oct 23", "SAT Oct 24"]);
  await act(async () => controls.button("Day").click());
  expect(controls.visibleDays()).toEqual(["SAT Oct 24"]);
  await act(async () => controls.button("3 days").click());
  expect(controls.visibleDays()).toEqual(["THU Oct 22", "FRI Oct 23", "SAT Oct 24"]);

  await act(async () => resize(768));
  expect(controls.visibleDays()).toEqual([
    "SUN Oct 18",
    "MON Oct 19",
    "TUE Oct 20",
    "WED Oct 21",
    "THU Oct 22",
    "FRI Oct 23",
    "SAT Oct 24",
  ]);
  await act(async () => resize(767));
  expect(controls.selectedDay()).toBe("SAT Oct 24");
  expect(controls.visibleDays()).toEqual(["THU Oct 22", "FRI Oct 23", "SAT Oct 24"]);
  await act(async () => controls.button("Day").click());
  expect(controls.visibleDays()).toEqual(["SAT Oct 24"]);
  await act(async () => resize(1280));
  await act(async () => resize(390));
  expect(controls.button("Day").getAttribute("aria-pressed")).toBe("true");
  expect(controls.selectedDay()).toBe("SAT Oct 24");
  expect(controls.visibleDays()).toEqual(["SAT Oct 24"]);
});
