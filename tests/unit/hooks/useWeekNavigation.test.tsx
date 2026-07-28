import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useWeekNavigation } from "../../../src/hooks/useWeekNavigation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function WeekStart() {
  const { weekStart } = useWeekNavigation([], "default");
  return createElement("span", null, weekStart.getDay());
}

function Navigation({
  items,
  resetKey = "default",
}: {
  items: { start: string }[];
  resetKey?: string;
}) {
  const { weekStart, goToNext } = useWeekNavigation(items, resetKey);
  return createElement(
    "div",
    null,
    createElement("span", null, weekStart.getDate()),
    createElement("button", { onClick: goToNext }, "Next"),
  );
}

describe("useWeekNavigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.setItem("weekStartsOnSunday", "0");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    localStorage.clear();
    container.remove();
  });

  it("starts Israeli forecast weeks on Sunday despite an obsolete saved preference", async () => {
    await act(async () => root.render(createElement(WeekStart)));

    expect(container.textContent).toBe("0");
  });

  it("preserves manual navigation when forecast data refreshes", async () => {
    const items = [{ start: new Date(2026, 6, 28, 9).toISOString() }];
    await act(async () => root.render(createElement(Navigation, { items })));
    expect(container.querySelector("span")?.textContent).toBe("26");

    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector("span")?.textContent).toBe("2");

    await act(async () =>
      root.render(createElement(Navigation, { items: items.map((item) => ({ ...item })) })),
    );
    expect(container.querySelector("span")?.textContent).toBe("2");
  });

  it("repositions to the earliest session when forecast configuration changes", async () => {
    const items = [{ start: new Date(2026, 6, 28, 9).toISOString() }];
    await act(async () => root.render(createElement(Navigation, { items })));
    await act(async () => container.querySelector("button")?.click());

    const updatedItems = [{ start: new Date(2026, 7, 11, 9).toISOString() }];
    await act(async () =>
      root.render(createElement(Navigation, { items: updatedItems, resetKey: "new-config" })),
    );

    expect(container.querySelector("span")?.textContent).toBe("9");
  });

  it("preserves navigation performed while changed forecast data is loading", async () => {
    const items = [{ start: new Date(2026, 6, 28, 9).toISOString() }];
    await act(async () => root.render(createElement(Navigation, { items })));
    await act(async () =>
      root.render(createElement(Navigation, { items: [], resetKey: "new-config" })),
    );
    await act(async () => container.querySelector("button")?.click());

    const loadedItems = [{ start: new Date(2026, 7, 11, 9).toISOString() }];
    await act(async () =>
      root.render(createElement(Navigation, { items: loadedItems, resetKey: "new-config" })),
    );

    expect(container.querySelector("span")?.textContent).toBe("2");
  });
});
