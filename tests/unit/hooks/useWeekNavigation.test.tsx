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
  const { weekStart, canGoPrev, goToPrev, goToNext } = useWeekNavigation(resetKey);
  return createElement(
    "div",
    null,
    createElement("span", null, weekStart.getDate()),
    createElement("button", { onClick: goToNext }, "Next"),
    createElement("button", { onClick: goToPrev, disabled: !canGoPrev }, "Previous"),
    createElement("button", { onClick: goToPrev }, "Force previous"),
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
});
