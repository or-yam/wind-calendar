import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../../shared/constants";
import type { CalendarConfig } from "../../../shared/types";
import { buildFullUrl } from "../../../src/lib/subscribe-urls";
import { SubscribeActions } from "../../../src/components/SubscribeActions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const config: CalendarConfig = { ...DEFAULTS, locations: [...DEFAULTS.locations] };
const writeText = vi.fn<() => Promise<void>>();

describe("SubscribeActions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const button = (label: string) =>
    container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  it("copies the subscription URL and clears the live message after a timeout", async () => {
    writeText.mockResolvedValue();
    await act(async () => root.render(createElement(SubscribeActions, { config })));

    await act(async () => {
      button("Copy subscription URL").click();
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(buildFullUrl(config));
    const status = container.querySelector('[role="status"]')!;
    expect(status.textContent).toBe("Subscription URL copied");

    await act(async () => vi.advanceTimersByTime(2000));
    expect(status.textContent).toBe("");
  });

  it("reports clipboard failures without leaving a stale success message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    writeText.mockRejectedValue(new Error("denied"));
    await act(async () => root.render(createElement(SubscribeActions, { config })));

    await act(async () => {
      button("Copy subscription URL").click();
      await Promise.resolve();
    });

    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Could not copy the subscription URL",
    );
  });

  it("downloads the configured feed as an .ics file", async () => {
    const clicked: { link?: HTMLAnchorElement } = {};
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.link = this;
    });
    await act(async () => root.render(createElement(SubscribeActions, { config })));

    await act(async () => button("Download .ics").click());

    expect(clicked.link?.download).toBe("wind-calendar-beit-yanai.ics");
    expect(clicked.link?.href).toBe(buildFullUrl(config));
  });
});
