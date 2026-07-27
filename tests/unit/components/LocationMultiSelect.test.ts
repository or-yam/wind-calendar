import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocationMultiSelect } from "../../../src/components/LocationMultiSelect";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("LocationMultiSelect", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("closes when clicking outside", () => {
    act(() => {
      root.render(
        createElement(LocationMultiSelect, {
          locations: ["beit-yanai"],
          onLocationsChange: vi.fn(),
        }),
      );
    });

    const picker = container.querySelector("details");
    if (!picker) throw new Error("Location picker was not rendered");
    picker.open = true;

    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(picker.open).toBe(false);
  });
});
