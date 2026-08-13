import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../../shared/constants";

const analytics = vi.hoisted(() => ({ captureEvent: vi.fn(), captureApiError: vi.fn() }));
vi.mock("../../../src/lib/analytics", () => analytics);

import { SubscribeButtons } from "../../../src/components/SubscribeButtons";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("SubscribeButtons analytics", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root.render(
        createElement(SubscribeButtons, {
          config: { ...DEFAULTS, locations: [...DEFAULTS.locations] },
        }),
      ),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    ["Apple Calendar", "apple"],
    ["Google Calendar", "google"],
    ["Outlook", "outlook"],
  ] as const)("tracks %s before navigation", async (label, provider) => {
    const link = [...container.querySelectorAll("a")].find((item) => item.textContent === label)!;
    await act(async () => link.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(analytics.captureEvent).toHaveBeenCalledWith("subscription clicked", { provider });
  });

  it("tracks copy only after clipboard success", async () => {
    let resolveCopy!: () => void;
    const writeText = vi.fn(() => new Promise<void>((resolve) => (resolveCopy = resolve)));
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const button = [...container.querySelectorAll("button")].find((item) =>
      item.textContent?.includes("Copy URL"),
    )!;

    await act(async () => button.click());
    expect(analytics.captureEvent).not.toHaveBeenCalled();
    await act(async () => resolveCopy());
    expect(analytics.captureEvent).toHaveBeenCalledWith("url copied", {});
  });

  it("does not track a failed copy", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("secret clipboard failure")) },
    });
    const button = [...container.querySelectorAll("button")].find((item) =>
      item.textContent?.includes("Copy URL"),
    )!;
    await act(async () => button.click());
    expect(analytics.captureEvent).not.toHaveBeenCalledWith("url copied", expect.anything());
  });

  it.each(["text/calendar", "text/calendar; charset=utf-8"])(
    "tracks a successful ICS download with content type %s",
    async (contentType) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR", {
            status: 200,
            headers: { "content-type": contentType },
          }),
        ),
      );
      vi.stubGlobal("URL", {
        ...URL,
        createObjectURL: vi.fn().mockReturnValue("blob:test"),
        revokeObjectURL: vi.fn(),
      });
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
      const button = [...container.querySelectorAll("button")].find((item) =>
        item.textContent?.includes("Download .ics"),
      )!;
      await act(async () => button.click());
      expect(analytics.captureEvent).toHaveBeenCalledWith("ics downloaded", {});
      expect(analytics.captureApiError).not.toHaveBeenCalled();
    },
  );

  it("does not activate when the calendar feed request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("secret feed failure", { status: 502 })),
    );
    const button = [...container.querySelectorAll("button")].find((item) =>
      item.textContent?.includes("Download .ics"),
    )!;
    await act(async () => button.click());
    expect(analytics.captureEvent).not.toHaveBeenCalledWith("ics downloaded", {});
    expect(analytics.captureApiError).toHaveBeenCalledWith("calendar", 502, "http");
    expect(analytics.captureApiError.mock.calls.flat()).not.toContain("secret feed failure");
  });

  it("rejects a non-calendar response without activating", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>not a calendar</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );
    const button = [...container.querySelectorAll("button")].find((item) =>
      item.textContent?.includes("Download .ics"),
    )!;
    await act(async () => button.click());
    expect(analytics.captureEvent).not.toHaveBeenCalledWith("ics downloaded", {});
    expect(analytics.captureApiError).toHaveBeenCalledWith("calendar", 200, "invalid response");
  });

  it("classifies browser download processing failures separately", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR", {
          status: 200,
          headers: { "content-type": "text/calendar; charset=UTF-8" },
        }),
      ),
    );
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => {
        throw new Error("failed");
      }),
    });
    const button = [...container.querySelectorAll("button")].find((item) =>
      item.textContent?.includes("Download .ics"),
    )!;
    await act(async () => button.click());
    expect(analytics.captureEvent).not.toHaveBeenCalledWith("ics downloaded", {});
    expect(analytics.captureApiError).toHaveBeenCalledWith("calendar", 200, "processing");
  });
});
