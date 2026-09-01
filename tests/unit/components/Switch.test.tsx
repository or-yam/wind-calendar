import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Switch } from "../../../src/components/ui/switch";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("Switch", () => {
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

  it("keeps the unchecked thumb visible and aligns rem-based geometry", async () => {
    await act(async () => root.render(createElement(Switch, { checked: false })));

    const track = container.querySelector<HTMLElement>('[role="switch"]')!;
    const thumb = track.firstElementChild!;

    expect(track.className).toContain("data-unchecked:bg-transparent");
    expect(thumb.className).toContain("data-checked:translate-x-5");
    expect(thumb.className).not.toContain("translate-x-[20px]");
  });
});
