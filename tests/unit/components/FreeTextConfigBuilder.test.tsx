import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DEFAULTS } from "../../../shared/constants";
import type { CalendarConfig } from "../../../shared/types";
import { FreeTextConfigBuilder } from "../../../src/components/FreeTextConfigBuilder";

const captureApiError = vi.hoisted(() => vi.fn());
vi.mock("../../../src/lib/analytics", () => ({ captureApiError }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("FreeTextConfigBuilder", () => {
  let container: HTMLDivElement;
  let root: Root;

  function renderBuilder(onConfig: (config: CalendarConfig, message: string) => void) {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(FreeTextConfigBuilder, { onConfig }),
      ),
    );
  }

  beforeEach(() => {
    captureApiError.mockReset();
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
    await act(async () => renderBuilder(onConfig));

    const input = container.querySelector("input")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(input, "גלישת קייט בתל אביב עם 12 קשר");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      container.querySelector("form")!.requestSubmit();
      await vi.waitFor(() => expect(container.textContent).toContain("Review this."));
    });

    expect(onConfig).toHaveBeenCalledWith(config, "Review this.");
  });

  it("does not call the server for short input", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => renderBuilder(vi.fn()));

    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a clear success outcome", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ outcome: "configured", message: "Review this.", config: DEFAULTS }),
      }),
    );
    await act(async () => renderBuilder(vi.fn()));

    const input = container.querySelector("input")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(input, "Beginner session in Tel Aviv");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      container.querySelector("form")!.requestSubmit();
      await vi.waitFor(() => expect(container.textContent).toContain("Configuration ready"));
    });

    expect(container.querySelector('[role="status"] svg')).not.toBeNull();
  });

  it("shows a destructive error outcome", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Service unavailable" }),
      }),
    );
    await act(async () => renderBuilder(vi.fn()));

    const input = container.querySelector("input")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(input, "Beginner session in Tel Aviv");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      container.querySelector("form")!.requestSubmit();
      await vi.waitFor(() => expect(container.textContent).toContain("Service unavailable"));
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not build configuration",
    );
  });

  it("captures non-JSON errors as invalid responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("gateway html", { status: 502 })),
    );
    await act(async () => renderBuilder(vi.fn()));
    const input = container.querySelector("input")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(input, "Beginner session in Tel Aviv");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      container.querySelector("form")!.requestSubmit();
      await vi.waitFor(() => expect(container.textContent).toContain("invalid response"));
    });
    expect(captureApiError).toHaveBeenCalledWith("interpret config", 502, "invalid response");
  });

  it("captures malformed successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ outcome: "configured", message: "missing config" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await act(async () => renderBuilder(vi.fn()));
    const input = container.querySelector("input")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(input, "Beginner session in Tel Aviv");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      container.querySelector("form")!.requestSubmit();
      await vi.waitFor(() => expect(container.textContent).toContain("invalid response"));
    });
    expect(captureApiError).toHaveBeenCalledWith("interpret config", 200, "invalid response");
  });
});
