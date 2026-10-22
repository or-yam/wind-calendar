import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCalendarApp } from "../helpers/calendar-app-render";

let app: ReturnType<typeof createCalendarApp>;
beforeEach(() => {
  app = createCalendarApp();
});
afterEach(() => app.cleanup());

it.each([
  { stored: "day", url: "three-days", expected: "Day" },
  { stored: null, url: "day", expected: "3 days" },
  { stored: "invalid", url: "day", expected: "3 days" },
])(
  "uses local preference $stored rather than shared URL mode $url",
  async ({ stored, url, expected }) => {
    if (stored !== null) localStorage.setItem("wind-calendar:calendar-view", stored);
    window.history.replaceState(null, "", `${window.location.search}&calendarView=${url}`);
    await app.render();
    expect(app.button(expected).getAttribute("aria-pressed")).toBe("true");
    expect(new URLSearchParams(window.location.search).has("calendarView")).toBe(false);
  },
);

it("persists both view choices across reload without changing URLs, history, or forecast requests", async () => {
  await app.render();
  const url = window.location.href;
  const historyLength = window.history.length;
  const pushState = vi.spyOn(window.history, "pushState");
  const initialCalls = app.forecastCalls.length;
  await act(async () => app.button("Day").click());
  await act(async () => app.resize(1280));
  await act(async () => app.resize(390));
  await act(async () => vi.advanceTimersByTimeAsync(600));
  expect(app.visibleDays()).toEqual(["WED Jul 29"]);
  expect(window.location.href).toBe(url);
  expect(window.history.length).toBe(historyLength);
  expect(pushState).not.toHaveBeenCalled();
  expect(app.forecastCalls).toHaveLength(initialCalls);
  await app.reload();
  expect(app.button("Day").getAttribute("aria-pressed")).toBe("true");
  await act(async () => app.button("3 days").click());
  await app.reload();
  expect(app.button("3 days").getAttribute("aria-pressed")).toBe("true");
  expect(window.location.href).toBe(url);
  expect(pushState).not.toHaveBeenCalled();
  const subscription = app.container.querySelector<HTMLAnchorElement>('a[href^="webcal:"]')!;
  expect(
    new URL(subscription.href.replace("webcal:", "https:")).searchParams.has("calendarView"),
  ).toBe(false);
  expect(app.forecastCalls.every((params) => !params.has("calendarView"))).toBe(true);
});

it("keeps the chosen view usable when browser storage is unavailable", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage blocked");
  });
  await app.render();
  expect(app.button("3 days").getAttribute("aria-pressed")).toBe("true");
  await act(async () => app.button("Day").click());
  await act(async () =>
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })),
  );
  expect(app.visibleDays()).toEqual(["WED Jul 29"]);
});

it("refreshes the preference when Back restores a page from the browser cache", async () => {
  await app.render();
  await act(async () => app.button("Day").click());
  localStorage.setItem("wind-calendar:calendar-view", "three-days");
  await act(async () =>
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })),
  );
  expect(app.button("3 days").getAttribute("aria-pressed")).toBe("true");
  expect(app.visibleDays()).toEqual(["WED Jul 29", "THU Jul 30", "FRI Jul 31"]);
});
