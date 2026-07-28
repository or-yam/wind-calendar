import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useWeekNavigation } from "../../../src/hooks/useWeekNavigation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function WeekStart() {
  const { weekStart } = useWeekNavigation([]);
  return createElement("span", null, weekStart.getDay());
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
});
