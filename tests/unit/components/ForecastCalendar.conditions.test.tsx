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

it("keeps a rollback-spanning session visible with local clock labels", async () => {
  vi.stubEnv("TZ", "Asia/Jerusalem");
  const base = makeSession("Jerusalem", 1, 2);
  await calendar.render(
    [
      {
        ...base,
        start: "2026-10-24T22:30:00.000Z",
        end: "2026-10-24T23:15:00.000Z",
      },
    ],
    { weekStart: new Date(2026, 9, 25), today: new Date(2026, 9, 25) },
  );
  const eventButton = event("Jerusalem");
  expect(eventButton.getAttribute("aria-label")).toContain("01:30 – 01:15");
  expect(eventButton.style.height).toBe("27px");
  expect(eventButton.textContent).not.toContain("UTC");
});

it("uses local clock geometry across a spring-forward gap", async () => {
  vi.stubEnv("TZ", "Europe/Berlin");
  await calendar.render(
    [
      {
        ...makeSession("Spring", 1, 2),
        start: "2026-03-29T00:30:00Z",
        end: "2026-03-29T01:15:00Z",
      },
    ],
    { weekStart: new Date(2026, 2, 29), today: new Date(2026, 2, 29) },
  );
  expect(event("Spring").getAttribute("aria-label")).toContain("01:30 – 03:15");
  expect(event("Spring").style.height).toBe("63px");
  expect(calendar.container.querySelector('[aria-label="Local clock hours"]')).not.toBeNull();
});

it("keeps sessions visible across a half-hour rollback without offset labels", async () => {
  vi.stubEnv("TZ", "Australia/Lord_Howe");
  await calendar.render(
    [
      {
        ...makeSession("Lord Howe", 1, 2),
        start: "2026-04-04T14:50:00Z",
        end: "2026-04-04T15:05:00Z",
      },
    ],
    { weekStart: new Date(2026, 3, 5), today: new Date(2026, 3, 5) },
  );
  expect(event("Lord Howe").getAttribute("aria-label")).toContain("01:50 – 01:35");
  expect(event("Lord Howe").style.height).toBe("9px");
});

it.each([
  ["Asia/Jerusalem", "2026-10-25"],
  ["Europe/Berlin", "2026-03-29"],
  ["Australia/Lord_Howe", "2026-04-05"],
])(
  "keeps daytime sessions aligned to local clock hours during clock changes in %s",
  async (tz, date) => {
    vi.stubEnv("TZ", tz);
    await calendar.render(
      [
        {
          ...makeSession("Daytime", 9, 11),
          start: new Date(`${date}T09:00:00`).toISOString(),
          end: new Date(`${date}T11:00:00`).toISOString(),
        },
      ],
      { weekStart: new Date(`${date}T00:00:00`), today: new Date(`${date}T00:00:00`) },
    );
    const session = event("Daytime");
    expect(session.getAttribute("aria-label")).toContain("09:00 – 11:00");
    expect(session.style.top).toBe("108px");
    expect(session.style.height).toBe("72px");
    expect(
      calendar.container.querySelector('[aria-label="Local clock hours"]')?.textContent,
    ).toContain("09:00");
    const note = [...calendar.container.querySelectorAll("p")].find((p) =>
      p.textContent?.startsWith("Clock-change week"),
    )!;
    expect(note.textContent).toBe("Clock-change week · all times shown in local time.");
    expect(note.classList.contains("invisible")).toBe(false);
    await act(async () => session.click());
    const details = calendar.container.querySelector('[aria-label="Session details"]')!;
    expect(details.textContent).toContain("09:00 – 11:00");
    expect(details.textContent).not.toContain("UTC");
    const previousWeek = new Date(`${date}T00:00:00`);
    previousWeek.setDate(previousWeek.getDate() - 7);
    await calendar.render([], { weekStart: previousWeek, today: previousWeek });
    expect(note.isConnected).toBe(true);
    expect(note.classList.contains("invisible")).toBe(true);
  },
);

it("keeps both badges and both directions for a combined match in a crowded lane", async () => {
  await calendar.render([makeSession("Bat Galim", 11, 15), makeSession("Beit Yanai", 11, 16)]);
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
  const original = makeSession("Bat Galim", 11, 15);
  await calendar.render([original]);
  await act(async () => event("Bat Galim").click());
  await calendar.render([{ ...original, wind: { ...original.wind, gustMax: 35 } }]);
  const details = calendar.container.querySelector<HTMLElement>('[aria-label="Session details"]')!;
  expect(details.textContent).toContain("Gusts 35 kn");
  await act(async () =>
    details.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  expect(document.activeElement).toBe(event("Bat Galim"));
  await act(async () => event("Bat Galim").click());
  await calendar.render([]);
  expect(calendar.container.querySelector('[aria-label="Session details"]')).toBeNull();
  await calendar.render([original]);
  expect(calendar.container.querySelector('[aria-label="Session details"]')).toBeNull();
});
