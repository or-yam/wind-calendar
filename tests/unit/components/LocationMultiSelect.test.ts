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

  it("limits selection to three spots while allowing a selected spot to be removed", () => {
    const onLocationsChange = vi.fn();
    act(() => {
      root.render(
        createElement(LocationMultiSelect, {
          locations: ["beit-yanai", "atlit", "eilat"],
          onLocationsChange,
        }),
      );
    });

    const options = [...container.querySelectorAll<HTMLButtonElement>('[role="checkbox"]')];
    expect(options.filter((option) => option.disabled)).toHaveLength(options.length - 3);
    expect(container.textContent).toContain("3/3 selected");

    const selected = options.find((option) => option.getAttribute("aria-checked") === "true")!;
    act(() => selected.click());
    expect(selected.textContent).toContain("Atlit");
    expect(onLocationsChange).toHaveBeenCalledWith(["beit-yanai", "eilat"]);
  });
});
