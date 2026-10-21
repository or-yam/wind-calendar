import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useMobileView } from "../../../src/hooks/useMobileView";
import { isMobileView } from "../../../src/lib/responsive";
import { stubViewport } from "../../helpers/viewport";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

function View() {
  return createElement("output", null, useMobileView() ? "mobile" : "desktop");
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.style.removeProperty("--breakpoint-md");
  document.documentElement.style.removeProperty("font-size");
  vi.unstubAllGlobals();
});

it.each([
  { breakpoint: "48rem", boundary: 768 },
  { breakpoint: "60rem", boundary: 960 },
])(
  "keeps the hook and utility on the theme's $breakpoint boundary",
  async ({ breakpoint, boundary }) => {
    const resize = stubViewport(boundary - 0.5, breakpoint);
    document.documentElement.style.fontSize = "18px";
    await act(async () => root.render(createElement(View)));
    expect(isMobileView()).toBe(true);
    expect(container.textContent).toBe("mobile");
    await act(async () => resize(boundary));
    expect(isMobileView()).toBe(false);
    expect(container.textContent).toBe("desktop");
    await act(async () => resize(boundary - 0.5));
    expect(isMobileView()).toBe(true);
    expect(container.textContent).toBe("mobile");
  },
);
