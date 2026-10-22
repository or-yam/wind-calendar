import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Hero } from "../../../src/components/Hero";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("Hero", () => {
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

  it("renders the compact brand header and tagline", async () => {
    await act(async () => root.render(createElement(Hero)));

    expect(container.querySelector("h1")?.textContent).toBe("Wind Calendar");
    expect(container.textContent).toContain("Only the days worth surfing Synced to your calendar");
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/android-chrome-512x512.png");
  });

  it("does not repeat the conditions form inside the hero", async () => {
    await act(async () => root.render(createElement(Hero)));

    expect(container.querySelector("h2")).toBeNull();
    expect(container.textContent).not.toContain("Choose your conditions");
  });
});
