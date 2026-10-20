import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ForecastSession } from "../../shared/forecast-types";
import { ForecastCalendar } from "../../src/components/ForecastCalendar";
import { Hero } from "../../src/components/Hero";

vi.mock("../../src/components/canvasui/VHS", () => ({
  default: ({ children }: { children: React.ReactNode }) => createElement("div", null, children),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const session: ForecastSession = {
  location: { id: "beit-yanai", label: "Beit Yanai" },
  start: new Date(2026, 6, 29, 9).toISOString(),
  end: new Date(2026, 6, 29, 12).toISOString(),
  matchType: "wind",
  wind: { min: 16, max: 20, gustMax: 23, direction: "W" },
  wave: { avgHeight: 1.2, avgPeriod: 8, direction: "NW" },
  swell: { avgHeight: 0.8, avgPeriod: 7 },
  hourly: [],
};

const NO_SESSIONS: ForecastSession[] = [];

function renderCards(overrides: Partial<Parameters<typeof ForecastCalendar>[0]> = {}) {
  return createElement(ForecastCalendar, {
    sessions: [session],
    isPending: false,
    error: null,
    weekStart: new Date(2026, 6, 26),
    today: new Date(2026, 6, 29),
    canGoPrev: false,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    ...overrides,
  });
}

describe("forecast calendar accessibility", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 6, 29, 12));
    HTMLElement.prototype.scrollTo = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("names the calendar and exposes session conditions without unnecessary tab stops", async () => {
    await act(async () => root.render(renderCards()));
    expect(
      container.querySelector('[role="region"][aria-label="Weekly forecast calendar"]'),
    ).not.toBeNull();
    const event = container.querySelector('button[aria-label*="at Beit Yanai"]')!;
    expect(event.getAttribute("aria-label")).toContain("09:00 – 12:00, Wind 16–20 kn W");
    expect(event.getAttribute("tabindex")).not.toBe("0");
    expect(event.querySelector('[aria-label^="Wave direction"]')).toBeNull();
    expect(event.textContent).not.toContain("1.2m");
  });

  it("announces loading instead of relying on skeletons", async () => {
    await act(async () => root.render(renderCards({ isPending: true, sessions: NO_SESSIONS })));

    expect(container.textContent).toContain("Loading the forecast");
    expect(
      container
        .querySelector('[role="region"][aria-label="Weekly forecast calendar"]')
        ?.getAttribute("aria-busy"),
    ).toBe("true");
    expect(container.textContent).not.toContain("No match");
    for (const skeleton of container.querySelectorAll("[data-slot='skeleton']")) {
      expect(skeleton.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("announces a forecast with no matching sessions", async () => {
    await act(async () => root.render(renderCards({ sessions: NO_SESSIONS })));

    expect(container.textContent).toContain("No sessions match this week");
  });

  it("announces a forecast error without rendering empty days", async () => {
    await act(async () =>
      root.render(renderCards({ sessions: NO_SESSIONS, error: new Error("QA unavailable") })),
    );

    expect(container.textContent).toContain("QA unavailable");
    expect(container.querySelectorAll('[aria-label$=": No sessions"]')).toHaveLength(0);
  });

  it("names the conditions section so its content sits in a landmark", async () => {
    await act(async () =>
      root.render(
        createElement(Hero, {
          locations: ["beit-yanai"],
          model: "om_gfs",
          availableModels: [],
          windEnabled: true,
          windMin: 14,
          windMax: 35,
          waveEnabled: false,
          waveSource: "total",
          waveHeightMin: 0.5,
          waveHeightMax: 3,
          wavePeriodMin: 0,
          minSessionHours: 2,
          onLocationsChange: vi.fn(),
          onModelChange: vi.fn(),
          onWindEnabledChange: vi.fn(),
          onWindRangeChange: vi.fn(),
          onWaveEnabledChange: vi.fn(),
          onWaveSourceChange: vi.fn(),
          onWaveHeightRangeChange: vi.fn(),
          onWavePeriodMinChange: vi.fn(),
          onMinSessionHoursChange: vi.fn(),
          onFreeTextConfig: vi.fn(),
          freeTextConfigBuilderEnabled: false,
          wavesForecastEnabled: true,
          windguruForecastModelsEnabled: false,
        }),
      ),
    );

    const heading = [...container.querySelectorAll("h2")].find(
      (h2) => h2.textContent === "Choose your conditions",
    )!;
    const section = heading.closest("section")!;
    expect(section.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(heading.id).not.toBe("");
  });
});
