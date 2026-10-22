import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "../../../src/hooks/useDebouncedValue";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function DebouncedValue({ value }: { value: number }) {
  return createElement("span", null, useDebouncedValue(value, 500));
}

describe("useDebouncedValue", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.useRealTimers();
    container.remove();
  });

  it("publishes only the latest value after the delay", async () => {
    await act(async () => root.render(createElement(DebouncedValue, { value: 14 })));
    await act(async () => root.render(createElement(DebouncedValue, { value: 15 })));
    await act(async () => root.render(createElement(DebouncedValue, { value: 16 })));

    expect(container.textContent).toBe("14");
    await act(async () => vi.advanceTimersByTime(499));
    expect(container.textContent).toBe("14");
    await act(async () => vi.advanceTimersByTime(1));
    expect(container.textContent).toBe("16");
  });
});
