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

it("places equal-start and nested Friday sessions beside each other, and touching sessions at full width", async () => {
  const sessions = [
    makeSession("Bat Galim", 11, 15),
    makeSession("Beit Yanai", 11, 16),
    makeSession("Herzliya", 12, 13),
    makeSession("Adjacent", 16, 17),
  ];
  await calendar.render(sessions);
  expect(event("Bat Galim").getAttribute("aria-label")).toContain("11:00 – 15:00");
  expect(event("Beit Yanai").getAttribute("aria-label")).toContain("11:00 – 16:00");
  expect(event("Herzliya").getAttribute("aria-label")).toContain("12:00 – 13:00");
  expect(event("Adjacent").getAttribute("aria-label")).toContain("16:00 – 17:00");
  const labels = sessions.map((s) => event(s.location.id).getAttribute("aria-label"));
  await calendar.render([...sessions].reverse());
  expect(sessions.map((s) => event(s.location.id).getAttribute("aria-label"))).toEqual(labels);
});

it("shows each overlapping session its own time range in the event text and accessible name", async () => {
  await calendar.render([makeSession("Bat Galim", 11, 15), makeSession("Beit Yanai", 11, 16)]);
  expect(event("Bat Galim").textContent).toContain("11:00 – 15:00");
  expect(event("Beit Yanai").textContent).toContain("11:00 – 16:00");
  expect(event("Bat Galim").getAttribute("aria-label")).toContain("11:00 – 15:00");
  expect(event("Beit Yanai").getAttribute("aria-label")).toContain("11:00 – 16:00");
});

it("keeps fractional and short sessions inside their time boundaries on an expanded, compact weekly scale", async () => {
  const short = {
    ...makeSession("Short", 5, 6),
    start: new Date(2026, 9, 23, 5, 15).toISOString(),
    end: new Date(2026, 9, 23, 5, 25).toISOString(),
  };
  await calendar.render([short, makeSession("Late", 21, 23)]);
  expect(calendar.container.textContent).toContain("05:00");
  expect(calendar.container.textContent).toContain("23:00");
  expect(event("Short").getAttribute("aria-label")).toContain("05:15 – 05:25");
  expect(event("Late").getAttribute("aria-label")).toContain("21:00 – 23:00");
});

it("segments midnight and visible-week boundaries without changing the original session times", async () => {
  const incoming = {
    ...makeSession("Incoming", 1, 2),
    start: new Date(2026, 9, 17, 23, 30).toISOString(),
    end: new Date(2026, 9, 18, 1, 15).toISOString(),
  };
  const overnight = { ...makeSession("Overnight", 23, 25) };
  const outgoing = {
    ...makeSession("Outgoing", 1, 2),
    start: new Date(2026, 9, 24, 22, 30).toISOString(),
    end: new Date(2026, 9, 25, 2).toISOString(),
  };
  const originals = JSON.stringify([incoming, overnight, outgoing]);
  await calendar.render([incoming, overnight, outgoing]);
  expect(event("Incoming").getAttribute("aria-label")).toContain(
    "SUN Oct 18 at Incoming: 00:00 – 01:15",
  );
  const segments = [
    ...calendar.container.querySelectorAll<HTMLElement>('[aria-label*="at Overnight:"]'),
  ];
  expect(segments).toHaveLength(2);
  expect(segments[0].getAttribute("aria-label")).toContain("23:00 – 24:00");
  expect(segments[1].getAttribute("aria-label")).toContain("00:00 – 01:00");
  expect(event("Outgoing").getAttribute("aria-label")).toContain("22:30 – 24:00");
  expect(calendar.container.textContent).toContain("24:00");
  expect(JSON.stringify([incoming, overnight, outgoing])).toBe(originals);
  await calendar.render([incoming, overnight, outgoing], { weekStart: new Date(2026, 9, 25) });
  expect(event("Outgoing").getAttribute("aria-label")).toMatch(
    /SUN Oct 25 at Outgoing: 00:00(?: UTC\+03:00)? – 02:00(?: UTC\+02:00)?/,
  );
  expect(calendar.container.querySelectorAll('[aria-label*="at Outgoing:"]')).toHaveLength(1);
});
