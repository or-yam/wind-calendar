import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const observabilityProps = vi.hoisted(() => ({
  analytics: undefined as undefined | { beforeSend: (event: { url: string }) => { url: string } },
  speedInsights: undefined as
    | undefined
    | { beforeSend: (event: { url: string }) => { url: string } },
}));

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: (options: { queryKey: string[] }) =>
    options.queryKey[0] === "features"
      ? { data: { freeTextConfigBuilder: true }, isPending: false, error: null }
      : { data: { sessions: [] }, isPending: false, error: null },
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: (props: typeof observabilityProps.analytics) => {
    observabilityProps.analytics = props;
    return null;
  },
}));

vi.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: (props: typeof observabilityProps.speedInsights) => {
    observabilityProps.speedInsights = props;
    return null;
  },
}));

vi.mock("../../src/components/Hero", async () => {
  const { createElement } = await import("react");
  return {
    Hero: (props: {
      model: string | number;
      onLocationsChange: (locations: string[]) => void;
      onFreeTextConfig: (config: unknown, message: string) => void;
      freeTextConfigBuilderEnabled: boolean;
    }) =>
      createElement(
        "div",
        { "data-free-text-config-enabled": props.freeTextConfigBuilderEnabled },
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
    observabilityProps.analytics = undefined;
    observabilityProps.speedInsights = undefined;
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

  it("removes query values from Vercel browser observability events", async () => {
    await act(async () => root.render(createElement(App)));

    expect(observabilityProps.analytics).toBeDefined();
    expect(observabilityProps.speedInsights).toBeDefined();
    const event = { url: "https://wind-calendar.test/?locations=private&windMin=17" };
    expect(observabilityProps.analytics!.beforeSend(event).url).toBe("https://wind-calendar.test/");
    expect(observabilityProps.speedInsights!.beforeSend(event).url).toBe(
      "https://wind-calendar.test/",
    );
  });
});
