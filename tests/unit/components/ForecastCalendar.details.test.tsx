import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCalendarHarness, makeSession } from "../../helpers/forecast-calendar-render";

let calendar: ReturnType<typeof createCalendarHarness>;
beforeEach(() => {
  calendar = createCalendarHarness();
});
afterEach(() => {
  calendar.cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const event = (id: string) => calendar.event(id);

it("names the session date once when it starts and ends on the same day", async () => {
  await calendar.render([makeSession("Bat Galim", 11, 15)]);
  await act(async () => event("Bat Galim").click());
  expect(calendar.container.querySelector('[aria-label="Session details"]')?.textContent).toContain(
    "Fri, Oct 23, 2026, 11:00 – 15:00",
  );
});

it("opens complete details and returns focus to the activating event", async () => {
  const overnight = makeSession("Bat Galim", 23, 25);
  await calendar.render([overnight]);
  const trigger = event("Bat Galim");
  await act(async () => trigger.click());
  const details = calendar.container.querySelector<HTMLElement>('[aria-label="Session details"]')!;
  expect(details.textContent).toContain("Fri, Oct 23, 2026, 23:00");
  expect(details.textContent).toContain("Sat, Oct 24, 2026, 01:00");
  expect(details.textContent).toContain("18–24 kn");
  expect(details.textContent).toContain("Gusts 30 kn");
  expect(details.textContent).toContain("Swell 0.8m 7s");
  expect(document.activeElement).toBe(details);
  await act(async () =>
    calendar.container
      .querySelector<HTMLButtonElement>('[aria-label="Close session details"]')!
      .click(),
  );
  expect(calendar.container.querySelector('[aria-label="Session details"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("closes details when the selected session leaves the visible week", async () => {
  await calendar.render([makeSession("Bat Galim", 11, 15)]);
  await act(async () => event("Bat Galim").click());
  await calendar.render([makeSession("Bat Galim", 11, 15)], { weekStart: new Date(2026, 9, 25) });
  expect(calendar.container.querySelector('[aria-label="Session details"]')).toBeNull();
});
