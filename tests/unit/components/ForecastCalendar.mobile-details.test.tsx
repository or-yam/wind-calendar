import { stubViewport } from "../../helpers/viewport";
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

it("closes details when the session leaves the visible days and does not reopen them on return", async () => {
  stubViewport(390);
  const sessions = [makeSession("Bat Galim", 11, 15)];
  await calendar.render(sessions, { today: new Date(2026, 9, 23) });
  await act(async () => event("Bat Galim").click());
  const saturday = calendar.container.querySelector<HTMLButtonElement>(
    'button[aria-label="SAT Oct 24"]',
  )!;
  await act(async () => saturday.click());
  expect(calendar.container.querySelector('[aria-label="Session details"]')).not.toBeNull();
  const dayMode = [...calendar.container.querySelectorAll("button")].find(
    (button) => button.textContent === "Day",
  )!;
  await act(async () => dayMode.click());
  expect(calendar.container.querySelector('[aria-label="Session details"]')).toBeNull();
  const friday = calendar.container.querySelector<HTMLButtonElement>(
    'button[aria-label="FRI Oct 23"]',
  )!;
  await act(async () => friday.click());
  expect(calendar.container.querySelector('[aria-label="Session details"]')).toBeNull();
});

it("returns focus to the remaining overnight segment after Day mode removes the trigger", async () => {
  stubViewport(390);
  const overnight = { ...makeSession("Bat Galim", 23, 25) };
  await calendar.render([overnight], { today: new Date(2026, 9, 23) });
  await act(async () => event("Bat Galim").click());
  const friday = calendar.container.querySelector<HTMLButtonElement>(
    'button[aria-label="FRI Oct 23"]',
  )!;
  await act(async () => friday.click());
  const saturdaySegment = calendar.container.querySelector<HTMLButtonElement>(
    'button[aria-label*="SAT Oct 24 at Bat Galim"]',
  )!;
  expect(saturdaySegment.getAttribute("aria-label")).toContain("SAT Oct 24 at Bat Galim");
  await act(async () => saturdaySegment.click());
  await act(async () =>
    [...calendar.container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Day")!
      .click(),
  );
  expect(saturdaySegment.isConnected).toBe(false);
  await act(async () =>
    calendar.container
      .querySelector<HTMLButtonElement>('[aria-label="Close session details"]')!
      .click(),
  );
  expect(document.activeElement).toBe(
    calendar.container.querySelector('button[aria-label*="FRI Oct 23 at Bat Galim"]'),
  );
});
