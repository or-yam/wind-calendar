import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import App from "../../src/App";
import { calendarControls } from "./calendar-controls";
import { stubViewport } from "./viewport";

vi.mock("@vercel/analytics/react", () => ({ Analytics: () => null }));
vi.mock("../../src/components/canvasui/VHS", async () => {
  const { createElement } = await import("react");
  return {
    default: (props: { children?: React.ReactNode }) => createElement("div", null, props.children),
  };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

export function createCalendarApp() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 29, 12));
  localStorage.clear();
  const resize = stubViewport(390);
  HTMLElement.prototype.scrollTo = vi.fn();
  window.history.replaceState(null, "", "/?locations=beit-yanai&model=om_gfs&waveEnabled=true");
  const forecastCalls: URLSearchParams[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), window.location.origin);
      if (url.pathname === "/api/features") return Response.json({ wavesForecast: true });
      if (url.pathname !== "/api/forecast") throw new Error(`Unexpected request: ${url.pathname}`);
      forecastCalls.push(url.searchParams);
      return Response.json({ sessions: [] });
    }),
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root = createRoot(container);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  const render = async () => {
    await act(async () =>
      root.render(createElement(QueryClientProvider, { client }, createElement(App))),
    );
    await act(async () => vi.advanceTimersByTimeAsync(600));
    await act(async () => vi.advanceTimersByTimeAsync(10));
  };
  return {
    container,
    forecastCalls,
    resize,
    render,
    ...calendarControls(container),
    async reload() {
      act(() => root.unmount());
      root = createRoot(container);
      await render();
    },
    async editFilter() {
      const input = container.querySelector<HTMLInputElement>(
        '[aria-label="Wave height range in meters"] input',
      )!;
      await act(async () => {
        input.focus();
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }));
      });
      await act(async () => vi.advanceTimersByTimeAsync(600));
      await act(async () => vi.advanceTimersByTimeAsync(10));
    },
    cleanup() {
      act(() => root.unmount());
      act(() => client.clear());
      container.remove();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      vi.useRealTimers();
    },
  };
}
