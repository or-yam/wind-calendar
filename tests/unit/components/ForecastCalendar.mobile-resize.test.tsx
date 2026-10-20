import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("switches between the week and the phone day view when the window is resized", async () => {
    let narrow = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        get matches() {
          return narrow;
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    await act(async () =>
      root.render(
        createElement(ForecastCalendar, {
          sessions: [],
          isPending: false,
          error: null,
          weekStart: new Date(2026, 6, 26),
          today: new Date(2026, 6, 29),
          canGoPrev: false,
          canGoNext: true,
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday: vi.fn(),
        }),
      ),
    );
    expect(container.querySelectorAll('[aria-label$=": No sessions"]')).toHaveLength(7);
    narrow = true;
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(container.querySelectorAll('[aria-label$=": No sessions"]')).toHaveLength(3);
    narrow = false;
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(container.querySelectorAll('[aria-label$=": No sessions"]')).toHaveLength(7);
  });
});
