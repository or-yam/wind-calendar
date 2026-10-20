import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ForecastCalendar } from "../../../src/components/ForecastCalendar";
import type { ForecastSession } from "../../../shared/forecast-types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;
const session = (id: string, start: number, end: number): ForecastSession => ({
  location: { id, label: id },
  start: new Date(2026, 9, 23, start).toISOString(),
  end: new Date(2026, 9, 23, end).toISOString(),
  matchType: "both",
  wind: { min: 18, max: 24, gustMax: 30, direction: "W" },
  wave: { avgHeight: 1.2, avgPeriod: 8, direction: "NW" },
  swell: { avgHeight: 0.8, avgPeriod: 7 },
  hourly: [],
});
const props = {
  isPending: false,
  error: null,
  weekStart: new Date(2026, 9, 18),
  today: new Date(2026, 9, 20),
  canGoPrev: false,
  onPrev: vi.fn(),
  onNext: vi.fn(),
  onToday: vi.fn(),
};
const render = async (sessions: ForecastSession[], overrides = {}) =>
  act(async () =>
    root.render(createElement(ForecastCalendar, { ...props, sessions, ...overrides })),
  );
const event = (id: string) => container.querySelector<HTMLElement>(`[aria-label*="at ${id}:"]`)!;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("places equal-start and nested Friday sessions beside each other, and touching sessions at full width", async () => {
  const sessions = [
    session("Bat Galim", 11, 15),
    session("Beit Yanai", 11, 16),
    session("Herzliya", 12, 13),
    session("Adjacent", 16, 17),
  ];
  await render(sessions);
  expect(event("Bat Galim").style.left).toBe("calc(0% + 2px)");
  expect(event("Beit Yanai").style.left).toBe("calc(33.3333% + 2px)");
  expect(event("Herzliya").style.left).toBe("calc(66.6667% + 2px)");
  expect(event("Adjacent").style.width).toBe("calc(100% - 4px)");
  const positions = sessions.map((s) => event(s.location.id).getAttribute("style"));
  await render([...sessions].reverse());
  expect(sessions.map((s) => event(s.location.id).getAttribute("style"))).toEqual(positions);
});

it("shows each overlapping session its own time range in the event text and accessible name", async () => {
  await render([session("Bat Galim", 11, 15), session("Beit Yanai", 11, 16)]);
  expect(event("Bat Galim").textContent).toContain("11:00 – 15:00");
  expect(event("Beit Yanai").textContent).toContain("11:00 – 16:00");
  expect(event("Bat Galim").getAttribute("aria-label")).toContain("11:00 – 15:00");
  expect(event("Beit Yanai").getAttribute("aria-label")).toContain("11:00 – 16:00");
});

it("keeps fractional and short sessions inside their time boundaries on an expanded, compact weekly scale", async () => {
  const short = {
    ...session("Short", 5, 6),
    start: new Date(2026, 9, 23, 5, 15).toISOString(),
    end: new Date(2026, 9, 23, 5, 25).toISOString(),
  };
  await render([short, session("Late", 21, 23)]);
  expect(container.textContent).toContain("05:00");
  expect(container.textContent).toContain("23:00");
  expect(event("Short").style.top).toBe("9px");
  expect(Number.parseFloat(event("Short").style.height)).toBeCloseTo(6);
  expect(event("Late").style.top).toBe("576px");
  expect(event("Late").style.height).toBe("72px");
});

it("segments midnight and visible-week boundaries without changing the original session times", async () => {
  const incoming = {
    ...session("Incoming", 1, 2),
    start: new Date(2026, 9, 17, 23, 30).toISOString(),
    end: new Date(2026, 9, 18, 1, 15).toISOString(),
  };
  const overnight = { ...session("Overnight", 23, 25) };
  const outgoing = {
    ...session("Outgoing", 1, 2),
    start: new Date(2026, 9, 24, 22, 30).toISOString(),
    end: new Date(2026, 9, 25, 2).toISOString(),
  };
  const originals = JSON.stringify([incoming, overnight, outgoing]);
  await render([incoming, overnight, outgoing]);
  expect(event("Incoming").getAttribute("aria-label")).toContain(
    "SUN Oct 18 at Incoming: 00:00 – 01:15",
  );
  const segments = [...container.querySelectorAll<HTMLElement>('[aria-label*="at Overnight:"]')];
  expect(segments).toHaveLength(2);
  expect(segments[0].getAttribute("aria-label")).toContain("23:00 – 24:00");
  expect(segments[0].style.height).toBe("36px");
  expect(segments[1].getAttribute("aria-label")).toContain("00:00 – 01:00");
  expect(segments[1].style.top).toBe("0px");
  expect(event("Outgoing").getAttribute("aria-label")).toContain("22:30 – 24:00");
  expect(container.textContent).toContain("24:00");
  expect(JSON.stringify([incoming, overnight, outgoing])).toBe(originals);
  await render([incoming, overnight, outgoing], { weekStart: new Date(2026, 9, 25) });
  expect(event("Outgoing").getAttribute("aria-label")).toContain(
    "SUN Oct 25 at Outgoing: 00:00 – 02:00",
  );
  expect(container.querySelectorAll('[aria-label*="at Outgoing:"]')).toHaveLength(1);
});

it("names the session date once when it starts and ends on the same day", async () => {
  await render([session("Bat Galim", 11, 15)]);
  await act(async () => event("Bat Galim").click());
  const details = container.querySelector<HTMLElement>('[aria-label="Session details"]')!;
  expect(details.textContent).toContain("Fri, Oct 23, 2026, 11:00 – 15:00");
});

it("opens complete original session details from a native button and returns focus on close", async () => {
  const overnight = { ...session("Bat Galim", 23, 25) };
  await render([overnight]);
  const trigger = event("Bat Galim");
  expect(trigger.tagName).toBe("BUTTON");
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  await act(async () => trigger.click());
  const details = container.querySelector<HTMLElement>(
    '[role="region"][aria-label="Session details"]',
  )!;
  expect(details).not.toBeNull();
  expect(details.textContent).toContain("Fri, Oct 23, 2026, 23:00");
  expect(details.textContent).toContain("Sat, Oct 24, 2026, 01:00");
  expect(details.textContent).toContain("18–24 kn");
  expect(details.textContent).toContain("Gusts 30 kn");
  expect(details.textContent).toContain("1.2m 8s");
  expect(details.textContent).toContain("Swell 0.8m 7s");
  expect(details.querySelector('[aria-label="Wind direction W"]')).not.toBeNull();
  expect(details.querySelector('[aria-label="Wave direction NW"]')).not.toBeNull();
  expect(document.activeElement).toBe(details);
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="Close session details"]')!.click(),
  );
  expect(container.querySelector('[aria-label="Session details"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("closes details when the session leaves the visible days and does not reopen them on return", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  const sessions = [session("Bat Galim", 11, 15)];
  await render(sessions, { today: new Date(2026, 9, 23) });
  await act(async () => event("Bat Galim").click());
  const saturday = container.querySelector<HTMLButtonElement>('button[aria-label="SAT Oct 24"]')!;
  await act(async () => saturday.click());
  expect(container.querySelector('[aria-label="Session details"]')).not.toBeNull();
  const dayMode = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Day",
  )!;
  await act(async () => dayMode.click());
  expect(container.querySelector('[aria-label="Session details"]')).toBeNull();
  const friday = container.querySelector<HTMLButtonElement>('button[aria-label="FRI Oct 23"]')!;
  await act(async () => friday.click());
  expect(container.querySelector('[aria-label="Session details"]')).toBeNull();
});

it("closes details when the visible week changes away from the session", async () => {
  await render([session("Bat Galim", 11, 15)]);
  await act(async () => event("Bat Galim").click());
  expect(container.querySelector('[aria-label="Session details"]')).not.toBeNull();
  await render([session("Bat Galim", 11, 15)], { weekStart: new Date(2026, 9, 25) });
  expect(container.querySelector('[aria-label="Session details"]')).toBeNull();
});

it("keeps both badges and both directions for a combined match in a crowded lane", async () => {
  await render([session("Bat Galim", 11, 15), session("Beit Yanai", 11, 16)]);
  const bat = event("Bat Galim");
  expect(bat.textContent).toContain("18–24 kn");
  expect(bat.textContent).toContain("1.2m 8s");
  expect(bat.querySelector('[aria-label="Wind direction W"]')).not.toBeNull();
  expect(bat.querySelector('[aria-label="Wave direction NW"]')).not.toBeNull();
  expect(event("Beit Yanai").getAttribute("aria-label")).toContain(
    "Wind 18–24 kn W, Wave 1.2m 8s NW",
  );
});

it("clears disappeared sessions, refreshes selected conditions, and closes with Escape", async () => {
  const original = session("Bat Galim", 11, 15);
  await render([original]);
  await act(async () => event("Bat Galim").click());
  await render([{ ...original, wind: { ...original.wind, gustMax: 35 } }]);
  const details = container.querySelector<HTMLElement>('[aria-label="Session details"]')!;
  expect(details.textContent).toContain("Gusts 35 kn");
  await act(async () =>
    details.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  expect(document.activeElement).toBe(event("Bat Galim"));
  await act(async () => event("Bat Galim").click());
  await render([]);
  expect(container.querySelector('[aria-label="Session details"]')).toBeNull();
  await render([original]);
  expect(container.querySelector('[aria-label="Session details"]')).toBeNull();
});
