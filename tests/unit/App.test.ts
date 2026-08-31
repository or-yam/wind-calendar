import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: (options: { queryKey: string[] }) =>
    options.queryKey[0] === "features"
      ? {
          data: {
            freeTextConfigBuilder: true,
            wavesForecast: true,
            windguruForecastModels: true,
          },
          isPending: false,
          error: null,
        }
      : { data: { sessions: [] }, isPending: false, error: null },
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => null,
}));

vi.mock("../../src/components/Hero", async () => {
  const { createElement } = await import("react");
  return {
    Hero: (props: {
      model: string | number;
      onLocationsChange: (locations: string[]) => void;
      onFreeTextConfig: (config: unknown, message: string) => void;
      freeTextConfigBuilderEnabled: boolean;
      wavesForecastEnabled: boolean;
      windguruForecastModelsEnabled: boolean;
    }) =>
      createElement(
        "div",
        {
          "data-free-text-config-enabled": props.freeTextConfigBuilderEnabled,
          "data-waves-enabled": props.wavesForecastEnabled,
          "data-windguru-models-enabled": props.windguruForecastModelsEnabled,
        },
        createElement(
          "button",
          {
            type: "button",
            onClick: () => props.onLocationsChange(["beit-yanai", "tel-aviv"]),
          },
          `Add Tel Aviv (${props.model})`,
        ),
        createElement(
          "button",
          {
            type: "button",
            onClick: () =>
              props.onFreeTextConfig(
                {
                  locations: ["tel-aviv"],
                  minSessionHours: 2,
                  model: "om_gfs",
                  windEnabled: true,
                  windMin: 12,
                  windMax: 20,
                  waveEnabled: false,
                  waveSource: "total",
                  waveHeightMin: 0.5,
                  waveHeightMax: 5,
                  wavePeriodMin: 0,
                },
                "Review this",
              ),
          },
          "Apply AI config",
        ),
      ),
  };
});

import App from "../../src/App";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("App location selection", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.history.replaceState(null, "", "/?locations=beit-yanai&model=om_gfs");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("keeps the selected Open-Meteo model when locations change", async () => {
    await act(async () => root.render(createElement(App)));

    const addTelAviv = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.startsWith("Add Tel Aviv"),
    );
    if (!addTelAviv) throw new Error("Location change control was not rendered");

    await act(async () => addTelAviv.click());

    expect(new URLSearchParams(window.location.search).get("model")).toBe("om_gfs");
    const hero = container.querySelector("[data-waves-enabled]")!;
    expect(hero.getAttribute("data-waves-enabled")).toBe("true");
    expect(hero.getAttribute("data-windguru-models-enabled")).toBe("true");
  });

  it("does not update subscription links until AI settings are confirmed", async () => {
    await act(async () => root.render(createElement(App)));

    const subscriptionLink = () =>
      container.querySelector<HTMLAnchorElement>('a[href^="webcal:"]')!;
    expect(subscriptionLink().href).toContain("locations=beit-yanai");

    const apply = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Apply AI config",
    )!;
    await act(async () => apply.click());
    expect(subscriptionLink().href).toContain("locations=beit-yanai");

    const confirm = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Confirm configuration",
    )!;
    await act(async () => confirm.click());
    expect(subscriptionLink().href).toContain("locations=tel-aviv");
  });

  it("shows the forecast before subscription actions", async () => {
    await act(async () => root.render(createElement(App)));

    const forecastHeading = [...container.querySelectorAll("h2")].find(
      (heading) => heading.textContent === "Upcoming sessions",
    )!;
    const subscriptionHeading = [...container.querySelectorAll("h2")].find(
      (heading) => heading.textContent === "Sync with your calendar",
    )!;

    expect(forecastHeading.compareDocumentPosition(subscriptionHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
