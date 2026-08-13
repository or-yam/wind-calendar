import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../../shared/constants";
import { NaturalLanguageBuilder } from "../../../src/components/NaturalLanguageBuilder";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("NaturalLanguageBuilder", () => {
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
    vi.unstubAllGlobals();
  });

  it("loads extracted settings into the editable flow", async () => {
    const config = { ...DEFAULTS, locations: ["tel-aviv"], windMin: 12, model: "om_gfs" };
    const onConfig = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ outcome: "configured", message: "Review this.", config }),
      }),
    );
    await act(async () => root.render(createElement(NaturalLanguageBuilder, { onConfig })));

    const input = container.querySelector("input")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(input, "גלישת קייט בתל אביב עם 12 קשר");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => container.querySelector("form")!.requestSubmit());

    expect(onConfig).toHaveBeenCalledWith(config, "Review this.");
    expect(container.textContent).toContain("Review this.");
  });

  it("does not call the server for short input", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await act(async () =>
      root.render(createElement(NaturalLanguageBuilder, { onConfig: vi.fn() })),
    );

    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
