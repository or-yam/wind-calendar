import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ForecastSession } from "../../../shared/forecast-types";
import { ForecastCalendar } from "../../../src/components/ForecastCalendar";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("ForecastCalendar", () => {
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
    vi.unstubAllGlobals();
  });
  it("does not focus or scroll when the day changes without user interaction", async () => {
    const weekStart = new Date(2026, 11, 27);
    const noSessions: ForecastSession[] = [];
    const renderCards = (today: Date) =>
      createElement(ForecastCalendar, {
        sessions: noSessions,
        isPending: false,
        error: null,
        weekStart,
        today,
        canGoPrev: false,
        canGoNext: true,
        onPrev: vi.fn(),
        onNext: vi.fn(),
        onToday: vi.fn(),
      });

    await act(async () => root.render(renderCards(new Date(2026, 11, 31))));
    vi.mocked(HTMLElement.prototype.scrollTo).mockClear();

    await act(async () => root.render(renderCards(new Date(2027, 0, 1))));

    expect(
      container.querySelector('[role="group"][aria-label="FRI Jan 1: No sessions"]'),
    ).not.toBeNull();
    expect(HTMLElement.prototype.scrollTo).not.toHaveBeenCalled();
  });
});
