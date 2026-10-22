import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics/react", () => ({ Analytics: () => null }));

import App from "../../src/App";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const WAVES_ON = {
  freeTextConfigBuilder: true,
  wavesForecast: true,
  windguruForecastModels: false,
};

const WAVE_URL =
  "/?locations=beit-yanai&model=om_gfs&minSessionHours=2&windEnabled=true&windMin=14&windMax=35" +
  "&waveEnabled=true&waveSource=total&waveHeightMin=0.5&waveHeightMax=3&wavePeriodMin=0";

interface ForecastCall {
  params: URLSearchParams;
}

describe("App wave height configuration", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  let forecastCalls: ForecastCall[];
  let features: typeof WAVES_ON;
  let interpretConfig: unknown;

  const waveHeightRange = () => {
    const group = container.querySelector('[aria-label="Wave height range in meters"]')!;
    return [...group.querySelectorAll<HTMLInputElement>('input[type="range"]')];
  };

  const params = () => new URLSearchParams(window.location.search);

  beforeEach(() => {
    vi.spyOn(console, "error");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 29, 12));
    HTMLElement.prototype.scrollTo = vi.fn();
    forecastCalls = [];
    features = WAVES_ON;
    interpretConfig = null;
    window.history.replaceState(null, "", WAVE_URL);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input), window.location.origin);
        if (url.pathname === "/api/features") {
          return new Response(JSON.stringify(features), {
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.pathname === "/api/forecast") {
          forecastCalls.push({ params: url.searchParams });
          return new Response(JSON.stringify({ sessions: [] }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.pathname === "/api/interpret-config" && interpretConfig) {
          return new Response(JSON.stringify(interpretConfig), {
            headers: { "Content-Type": "application/json" },
          });
        }
        throw new Error(`Unexpected request: ${url.pathname}`);
      }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    act(() => queryClient.clear());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    const errors = vi.mocked(console.error).mock.calls;
    vi.restoreAllMocks();
    expect(errors).toEqual([]);
  });

  async function renderApp() {
    await act(async () =>
      root.render(createElement(QueryClientProvider, { client: queryClient }, createElement(App))),
    );
    await act(async () => vi.advanceTimersByTime(600));
  }

  async function pressArrowOn(input: HTMLInputElement | undefined, key: string) {
    await act(async () => {
      input?.focus();
      input?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      input?.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
    });
    await act(async () => vi.advanceTimersByTime(600));
  }

  it("starts with ICON and one hour, and keeps session edits in the URL, feed and forecast", async () => {
    window.history.replaceState(null, "", "/");
    await renderApp();

    const input = container.querySelector<HTMLInputElement>("#min-session")!;
    expect(input.value).toBe("1");
    expect(params().get("model")).toBe("om_icon");
    expect(params().get("minSessionHours")).toBe("1");
    expect(forecastCalls.at(-1)!.params.get("model")).toBe("om_icon");

    await pressArrowOn(input, "ArrowUp");

    expect(input.value).toBe("1.5");
    expect(params().get("minSessionHours")).toBe("1.5");
    expect(forecastCalls.at(-1)!.params.get("minSessionHours")).toBe("1.5");
    const subscription = container.querySelector<HTMLAnchorElement>('a[href^="webcal:"]')!;
    const linkParams = new URL(subscription.href.replace("webcal:", "https:")).searchParams;
    expect(linkParams.get("model")).toBe("om_icon");
    expect(linkParams.get("minSessionHours")).toBe("1.5");
  });

  it("keeps an edited wave minimum in the URL, subscription link and forecast request", async () => {
    await renderApp();

    const [minimum, maximum] = waveHeightRange();
    await pressArrowOn(minimum, "ArrowRight");

    expect(minimum?.value).toBe("0.6");
    expect(maximum?.value).toBe("3");
    expect(params().get("waveHeightMin")).toBe("0.6");
    expect(params().get("waveHeightMax")).toBe("3");

    const subscription = container.querySelector<HTMLAnchorElement>('a[href^="webcal:"]')!;
    const linkParams = new URL(subscription.href.replace("webcal:", "https:")).searchParams;
    expect(linkParams.get("waveHeightMin")).toBe("0.6");
    expect(linkParams.get("waveHeightMax")).toBe("3");

    const settled = forecastCalls.at(-1)!.params;
    expect(settled.get("waveHeightMin")).toBe("0.6");
    expect(settled.get("waveHeightMax")).toBe("3");
  });

  it("keeps an edited wave maximum without reverting the minimum", async () => {
    await renderApp();

    const [minimum, maximum] = waveHeightRange();
    await pressArrowOn(maximum, "ArrowLeft");

    expect(minimum?.value).toBe("0.5");
    expect(maximum?.value).toBe("2.9");
    expect(params().get("waveHeightMin")).toBe("0.5");
    expect(params().get("waveHeightMax")).toBe("2.9");
    expect(forecastCalls.at(-1)!.params.get("waveHeightMax")).toBe("2.9");
  });

  it("applies both boundaries from separate gestures without reverting either", async () => {
    await renderApp();

    const [minimum, maximum] = waveHeightRange();
    await pressArrowOn(minimum, "ArrowRight");
    await pressArrowOn(maximum, "ArrowLeft");

    expect(params().get("waveHeightMin")).toBe("0.6");
    expect(params().get("waveHeightMax")).toBe("2.9");
    const settled = forecastCalls.at(-1)!.params;
    expect(settled.get("waveHeightMin")).toBe("0.6");
    expect(settled.get("waveHeightMax")).toBe("2.9");
  });

  it("restores both edited boundaries when reloading the configured URL", async () => {
    await renderApp();

    const [minimum, maximum] = waveHeightRange();
    await pressArrowOn(minimum, "ArrowRight");
    await pressArrowOn(maximum, "ArrowLeft");

    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    act(() => root.unmount());
    root = createRoot(container);
    await act(async () =>
      root.render(createElement(QueryClientProvider, { client: queryClient }, createElement(App))),
    );
    await act(async () => vi.advanceTimersByTime(600));

    const [restoredMinimum, restoredMaximum] = waveHeightRange();
    expect(restoredMinimum?.value).toBe("0.6");
    expect(restoredMaximum?.value).toBe("2.9");
  });

  it("holds subscription links until confirmation when a draft changes the wave range", async () => {
    await renderApp();

    const subscription = container.querySelector<HTMLAnchorElement>('a[href^="webcal:"]')!;
    const original = subscription.href;

    const input = container.querySelector<HTMLInputElement>("#free-text-config-request")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "Beginner kitesurfing at Beit Yanai, waves 1.2 to 1.8 meters");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      interpretConfig = {
        outcome: "configured",
        config: {
          locations: ["beit-yanai"],
          minSessionHours: 2,
          model: "om_gfs",
          windEnabled: true,
          windMin: 14,
          windMax: 35,
          waveEnabled: true,
          waveSource: "total",
          waveHeightMin: 0.5,
          waveHeightMax: 3,
          wavePeriodMin: 0,
        },
        message: "Loaded wave settings",
      };
      container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    });
    await act(async () => vi.advanceTimersByTime(600));

    const [draftMinimum] = waveHeightRange();
    await pressArrowOn(draftMinimum, "ArrowRight");

    expect(params().get("waveHeightMin")).toBe("0.6");
    expect(forecastCalls.at(-1)!.params.get("waveHeightMin")).toBe("0.6");
    expect(container.querySelector<HTMLAnchorElement>('a[href^="webcal:"]')!.href).toBe(original);

    const confirm = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Confirm configuration",
    )!;
    await act(async () => confirm.click());

    const confirmedParams = new URL(
      container
        .querySelector<HTMLAnchorElement>('a[href^="webcal:"]')!
        .href.replace("webcal:", "https:"),
    ).searchParams;
    expect(confirmedParams.get("waveHeightMin")).toBe("0.6");
  });

  it("hides wave controls when the waves feature flag is disabled", async () => {
    features = { ...WAVES_ON, wavesForecast: false };
    await renderApp();

    expect(container.querySelector('[aria-label="Wave height range in meters"]')).toBeNull();
  });

  it("enables wind from a wave-only URL when the waves flag is disabled", async () => {
    features = { ...WAVES_ON, wavesForecast: false };
    window.history.replaceState(
      null,
      "",
      WAVE_URL.replace("windEnabled=true", "windEnabled=false"),
    );
    await renderApp();
    await act(async () => vi.advanceTimersByTime(600));

    expect(container.querySelector('[aria-label="Toggle wind forecast"]')).toBeNull();
    expect(container.querySelector("#wind-min")).not.toBeNull();
    expect(params().get("windEnabled")).toBe("true");
    expect(forecastCalls.at(-1)!.params.get("windEnabled")).toBe("true");
    const subscription = container.querySelector<HTMLAnchorElement>('a[href^="webcal:"]')!;
    const linkParams = new URL(subscription.href.replace("webcal:", "https:")).searchParams;
    expect(linkParams.get("windEnabled")).toBe("true");
  });
});
