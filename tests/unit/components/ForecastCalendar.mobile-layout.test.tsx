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

  it("lets phone readers select one day without squeezing the week into columns", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
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
          onPrev: vi.fn(),
          onNext: vi.fn(),
          onToday: vi.fn(),
        }),
      ),
    );
    expect(
      container.querySelectorAll(
        '[role="region"][aria-label="Weekly forecast calendar"] [role="group"]',
      ),
    ).toHaveLength(3);
    const friday = container.querySelector<HTMLButtonElement>('button[aria-label="FRI Jul 31"]');
    expect(friday).not.toBeNull();
    await act(async () => friday!.click());
    expect(friday!.getAttribute("aria-pressed")).toBe("true");
    expect(
      container.querySelectorAll(
        '[role="region"][aria-label="Weekly forecast calendar"] [role="group"]',
      ),
    ).toHaveLength(3);
    const dayMode = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Day",
    )!;
    await act(async () => dayMode.click());
    expect(
      container.querySelectorAll(
        '[role="region"][aria-label="Weekly forecast calendar"] [role="group"]',
      ),
    ).toHaveLength(1);
    expect(
      container.querySelector('[role="group"][aria-label="FRI Jul 31: No sessions"]'),
    ).not.toBeNull();
    const today = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Today",
    )!;
    await act(async () => today.click());
    expect(
      container.querySelector('[role="group"][aria-label="WED Jul 29: No sessions"]'),
    ).not.toBeNull();
    vi.unstubAllGlobals();
  });
});
