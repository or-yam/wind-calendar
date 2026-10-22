import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWeekNavigation } from "../../../src/hooks/useWeekNavigation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function WeekStart() {
  const { weekStart } = useWeekNavigation("default");
  return createElement("span", null, weekStart.getDay());
}

function Navigation({ resetKey = "default" }: { resetKey?: string }) {
  const { weekStart, canGoPrev, canGoNext, goToPrev, goToNext } = useWeekNavigation(resetKey);
  return createElement(
    "div",
    null,
    createElement("span", null, weekStart.getDate()),
    createElement("button", { onClick: goToNext, disabled: !canGoNext }, "Next"),
    createElement("button", { onClick: goToPrev, disabled: !canGoPrev }, "Previous"),
    createElement("button", { onClick: goToPrev }, "Force previous"),
    createElement("button", { onClick: goToNext }, "Force next"),
  );
}

describe("useWeekNavigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 29, 12));
    localStorage.setItem("weekStartsOnSunday", "0");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.useRealTimers();
    localStorage.clear();
    container.remove();
  });

  it("starts Israeli forecast weeks on Sunday despite an obsolete saved preference", async () => {
    await act(async () => root.render(createElement(WeekStart)));

    expect(container.textContent).toBe("0");
  });

  it("preserves manual navigation when the component rerenders", async () => {
    await act(async () => root.render(createElement(Navigation)));
    expect(container.querySelector("span")?.textContent).toBe("26");

    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector("span")?.textContent).toBe("2");

    await act(async () => root.render(createElement(Navigation)));
    expect(container.querySelector("span")?.textContent).toBe("2");
  });

  it("does not navigate before the current week", async () => {
    await act(async () => root.render(createElement(Navigation)));

    const previous = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Previous",
    )!;
    expect(previous.disabled).toBe(true);

    const forcePrevious = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Force previous",
    )!;
    await act(async () => forcePrevious.click());

    expect(container.querySelector("span")?.textContent).toBe("26");
  });

  it("caps navigation two weeks ahead even when the handler is called directly", async () => {
    await act(async () => root.render(createElement(Navigation)));
    const buttons = [...container.querySelectorAll("button")];
    const next = buttons.find((button) => button.textContent === "Next")!;
    const forceNext = buttons.find((button) => button.textContent === "Force next")!;
    await act(async () => next.click());
    expect(next.disabled).toBe(false);
    await act(async () => next.click());
    expect(container.querySelector("span")?.textContent).toBe("9");
    expect(next.disabled).toBe(true);

    await act(async () => {
      forceNext.click();
      forceNext.click();
    });
    expect(container.querySelector("span")?.textContent).toBe("9");

    vi.setSystemTime(new Date(2026, 7, 2, 12));
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(next.disabled).toBe(false);
    await act(async () => next.click());
    expect(container.querySelector("span")?.textContent).toBe("16");
    expect(next.disabled).toBe(true);
  });

  it("allows returning from a future week to the current week", async () => {
    await act(async () => root.render(createElement(Navigation)));

    const buttons = [...container.querySelectorAll("button")];
    const next = buttons.find((button) => button.textContent === "Next")!;
    const previous = buttons.find((button) => button.textContent === "Previous")!;
    await act(async () => next.click());
    expect(previous.disabled).toBe(false);

    await act(async () => previous.click());
    expect(container.querySelector("span")?.textContent).toBe("26");
    expect(previous.disabled).toBe(true);
  });

  it("repositions to today when forecast configuration changes", async () => {
    await act(async () => root.render(createElement(Navigation)));
    await act(async () => container.querySelector("button")?.click());

    await act(async () => root.render(createElement(Navigation, { resetKey: "new-config" })));

    expect(container.querySelector("span")?.textContent).toBe("26");
  });

  it("advances a stale selection at Sunday midnight without user interaction", async () => {
    vi.setSystemTime(new Date(2026, 7, 1, 23, 59, 59));
    await act(async () => root.render(createElement(Navigation)));

    await act(async () => vi.advanceTimersByTime(1000));

    expect(container.querySelector("span")?.textContent).toBe("2");
  });

  it("clamps a stale selection when rerendering after multiple idle weeks", async () => {
    await act(async () => root.render(createElement(Navigation)));
    vi.setSystemTime(new Date(2026, 7, 9, 12));

    await act(async () => root.render(createElement(Navigation)));

    expect(container.querySelector("span")?.textContent).toBe("9");
  });

  it("navigates Next from the current week after multiple idle weeks", async () => {
    await act(async () => root.render(createElement(Navigation)));
    vi.setSystemTime(new Date(2026, 7, 9, 12));

    await act(async () => container.querySelector("button")?.click());

    expect(container.querySelector("span")?.textContent).toBe("16");
  });

  it.each(["focus", "visibilitychange"])("refreshes a stale week on %s", async (event) => {
    await act(async () => root.render(createElement(Navigation)));
    vi.setSystemTime(new Date(2026, 7, 9, 12));

    await act(async () => (event === "focus" ? window : document).dispatchEvent(new Event(event)));

    expect(container.querySelector("span")?.textContent).toBe("9");
  });

  it("preserves a future selection when Sunday passes", async () => {
    vi.setSystemTime(new Date(2026, 7, 1, 23, 59, 59));
    await act(async () => root.render(createElement(Navigation)));
    await act(async () => container.querySelector("button")?.click());
    await act(async () => container.querySelector("button")?.click());

    await act(async () => vi.advanceTimersByTime(1000));

    expect(container.querySelector("span")?.textContent).toBe("9");
  });

  it("disables Previous when the selected future week becomes the current week", async () => {
    vi.setSystemTime(new Date(2026, 7, 1, 23, 59, 59));
    await act(async () => root.render(createElement(Navigation)));
    await act(async () => container.querySelector("button")?.click());

    await act(async () => vi.advanceTimersByTime(1000));

    const previous = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Previous",
    )!;
    expect(previous.disabled).toBe(true);
  });

  it("clears the rollover timer and resume listeners on unmount", async () => {
    await act(async () => root.render(createElement(Navigation)));
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => root.render(null));
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(vi.getTimerCount()).toBe(0);
  });
});
