import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../../src/App";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 29, 12));
  window.history.replaceState(null, "", "/?locations=beit-yanai&model=om_gfs");
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("integrates forecast responses, week navigation, Today and filter reset", async () => {
  const fetchMock = vi.fn(async (input: string | URL | Request) =>
    Response.json(
      String(input).startsWith("/api/features")
        ? { wavesForecast: true, freeTextConfigBuilder: false, windguruForecastModels: false }
        : {
            sessions: [
              {
                location: { id: "beit-yanai", label: "Beit Yanai" },
                start: new Date(2026, 6, 29, 9).toISOString(),
                end: new Date(2026, 6, 29, 12).toISOString(),
                matchType: "both",
                wind: { min: 18, max: 24, gustMax: 28, direction: "W" },
                wave: { avgHeight: 1.2, avgPeriod: 8, direction: "NW" },
                swell: { avgHeight: 1, avgPeriod: 7 },
                hourly: [],
              },
            ],
          },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  await act(async () =>
    root.render(createElement(QueryClientProvider, { client }, createElement(App))),
  );
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(container.querySelector('[aria-label*="at Beit Yanai"]')?.textContent).toContain(
    "18–24 kn",
  );
  const button = (name: string) =>
    [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(name))!;
  expect(button("Prev").disabled).toBe(true);
  await act(async () => button("Next").click());
  expect(container.textContent).toContain("Aug 2 – 8, 2026");
  expect(
    container.querySelector('[aria-label="Upcoming sessions"] [role="status"]')?.textContent,
  ).toBe("No sessions match this week");
  await act(async () => button("Prev").click());
  expect(container.textContent).toContain("Jul 26 – Aug 1, 2026");
  await act(async () => button("Next").click());
  await act(async () => button("Today").click());
  expect(container.querySelector('[aria-label*="at Beit Yanai"]')).not.toBeNull();
  await act(async () => button("Next").click());
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[aria-label="Toggle wave forecast"]')!.click(),
  );
  expect(container.textContent).toContain("Jul 26 – Aug 1, 2026");
  await act(async () => vi.advanceTimersByTimeAsync(501));
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes("waveEnabled=true"))).toBe(true);
});
