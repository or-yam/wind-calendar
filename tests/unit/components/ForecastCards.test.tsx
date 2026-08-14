import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ForecastSession } from "../../../shared/forecast-types";
import { ForecastCards } from "../../../src/components/ForecastCards";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("ForecastCards", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders same-day sessions with directions in one horizontal track", async () => {
    const weekStart = new Date(2026, 6, 27);
    const session: ForecastSession = {
      location: { id: "beit-yanai", label: "Beit Yanai" },
      start: new Date(2026, 6, 28, 9).toISOString(),
      end: new Date(2026, 6, 28, 12).toISOString(),
      matchType: "both",
      wind: { min: 12, max: 16, gustMax: 20, direction: "W" },
      wave: { avgHeight: 1.2, avgPeriod: 8, direction: "NW" },
      swell: { avgHeight: 0.8, avgPeriod: 7 },
      hourly: [],
    };
    const sessions = [
      session,
      {
        ...session,
        start: new Date(2026, 6, 28, 13).toISOString(),
        end: new Date(2026, 6, 28, 14).toISOString(),
        matchType: "wind" as const,
        wind: { ...session.wind, direction: "N" },
      },
      {
        ...session,
        start: new Date(2026, 6, 28, 15).toISOString(),
        end: new Date(2026, 6, 28, 16).toISOString(),
        matchType: "wind" as const,
        wind: { ...session.wind, direction: "S" },
      },
    ];

    await act(async () =>
      root.render(
        createElement(ForecastCards, {
          sessions,
          isPending: false,
          error: null,
          weekStart,
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday: vi.fn(),
        }),
      ),
    );

    const windDirection = container.querySelector<HTMLElement>(
      '[role="img"][aria-label="Wind direction W"]',
    );
    const windArrow = windDirection?.querySelector<HTMLElement>("span");
    const waveDirection = container.querySelector<HTMLElement>(
      '[role="img"][aria-label="Wave direction NW"]',
    );
    const waveArrow = waveDirection?.querySelector<HTMLElement>("span:nth-child(2)");
    expect(windDirection?.textContent).toBe("►-W");
    expect(windArrow?.style.transform).toBe("rotate(0deg)");
    expect(waveDirection?.textContent).toBe("≈►-NW");
    expect(waveArrow?.style.transform).toBe("rotate(45deg)");
    expect(
      container.querySelector<HTMLElement>('[aria-label="Wind direction N"] span')?.style.transform,
    ).toBe("rotate(90deg)");
    expect(
      container.querySelector<HTMLElement>('[aria-label="Wind direction S"] span')?.style.transform,
    ).toBe("rotate(270deg)");

    const badges = [...container.querySelectorAll("span.rounded")].map(
      (badge) => badge.textContent,
    );
    expect(badges).toContain("1.2m 8s");
    expect(badges).toContain("12–16 kn");
    expect(
      container.querySelector('[aria-label*="Wind 12–16 kn W, Wave 1.2m 8s NW"]'),
    ).not.toBeNull();

    const sessionTrack = container.querySelector(".forecast-scroll");
    const sessionCards = container.querySelectorAll('[aria-label*="at Beit Yanai"]');
    expect(sessionTrack).not.toBeNull();
    expect(sessionTrack?.classList).toContain("overflow-x-auto");
    expect(sessionCards).toHaveLength(3);
    for (const card of sessionCards) {
      expect(card.parentElement).toBe(sessionTrack);
    }
  });

  it("focuses and scrolls today into view when Today is clicked", async () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const session: ForecastSession = {
      location: { id: "beit-yanai", label: "Beit Yanai" },
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9).toISOString(),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString(),
      matchType: "wind",
      wind: { min: 12, max: 16, gustMax: 20, direction: "W" },
      wave: { avgHeight: 1.2, avgPeriod: 8, direction: "NW" },
      swell: { avgHeight: 0.8, avgPeriod: 7 },
      hourly: [],
    };
    const onToday = vi.fn();

    await act(async () =>
      root.render(
        createElement(ForecastCards, {
          sessions: [session],
          isPending: false,
          error: null,
          weekStart,
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday,
        }),
      ),
    );
    const today = container.querySelector<HTMLElement>("[data-today='true']")!;
    expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith({
      left: 0,
      behavior: "auto",
    });

    vi.mocked(HTMLElement.prototype.scrollTo).mockClear();
    const todayButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Today",
    )!;
    await act(async () => todayButton.click());

    expect(onToday).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(today);
    expect(HTMLElement.prototype.scrollTo).toHaveBeenCalledWith({
      left: 0,
      behavior: "smooth",
    });
  });
});
