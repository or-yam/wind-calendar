import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarConfig } from "../../shared/types";
import i18n from "../../src/i18n";

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

vi.mock("../../src/components/ConditionsPanel", async () => {
  const { createElement } = await import("react");
  const { buildWebcalUrl } = await import("../../src/lib/subscribe-urls");
  return {
    ConditionsPanel: (props: {
      confirmedConfig: CalendarConfig;
      model: string | number;
      onLocationsChange: (locations: string[]) => void;
      onWindRangeChange: (range: [number, number]) => void;
      onFreeTextConfig: (config: unknown, message: string) => void;
      confirmationPending: boolean;
      onConfirmConfig: () => void;
      freeTextConfigBuilderEnabled: boolean;
      wavesForecastEnabled: boolean;
      windguruForecastModelsEnabled: boolean;
    }) =>
      createElement(
        "section",
        {
          "data-free-text-config-enabled": props.freeTextConfigBuilderEnabled,
          "data-waves-enabled": props.wavesForecastEnabled,
          "data-windguru-models-enabled": props.windguruForecastModelsEnabled,
        },
        createElement("h3", null, "Add to your calendar"),
        createElement("a", { href: buildWebcalUrl(props.confirmedConfig) }, "Apple Calendar"),
        props.confirmationPending &&
          createElement(
            "button",
            { type: "button", onClick: props.onConfirmConfig },
            "Confirm configuration",
          ),
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
            onClick: () => props.onWindRangeChange([10, 40]),
          },
          "Set wind range",
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
    localStorage.removeItem("wind-calendar:locale");
    HTMLElement.prototype.scrollTo = vi.fn();
    window.history.replaceState(null, "", "/?locations=beit-yanai&model=om_gfs");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.removeItem("wind-calendar:locale");
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

  it("updates both wind range boundaries atomically", async () => {
    await act(async () => root.render(createElement(App)));

    const setWindRange = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Set wind range",
    )!;
    await act(async () => setWindRange.click());

    const params = new URLSearchParams(window.location.search);
    expect(params.get("windMin")).toBe("10");
    expect(params.get("windMax")).toBe("40");
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

  it("shows subscription actions before the forecast", async () => {
    await act(async () => root.render(createElement(App)));

    const actionHeading = [...container.querySelectorAll("h3")].find(
      (heading) => heading.textContent === "Add to your calendar",
    )!;
    const forecastHeading = [...container.querySelectorAll("h2")].find(
      (heading) => heading.textContent === "Upcoming sessions",
    )!;

    expect(actionHeading.compareDocumentPosition(forecastHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("renders an accessible language picker before the hero controls", async () => {
    await act(async () => root.render(createElement(App)));

    const picker = container.querySelector<HTMLSelectElement>("#language-picker")!;
    expect(container.querySelector('label[for="language-picker"]')?.textContent).toBe("Language");
    expect(container.querySelector("select, button")).toBe(picker);
    expect(picker.value).toBe("en");
    expect([...picker.options].map((option) => option.textContent)).toEqual(["English", "עברית"]);
  });

  it("switches to Hebrew, updates document direction, and preserves locale on config changes", async () => {
    await act(async () => root.render(createElement(App)));
    const picker = container.querySelector<HTMLSelectElement>("#language-picker")!;

    await act(async () => {
      picker.value = "he";
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(document.documentElement.lang).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
    expect(localStorage.getItem("wind-calendar:locale")).toBe("he");
    expect(new URLSearchParams(window.location.search).has("lang")).toBe(false);
    expect([...picker.options].map((option) => option.textContent)).toEqual(["English", "עברית"]);

    const addTelAviv = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.startsWith("Add Tel Aviv"),
    )!;
    await act(async () => addTelAviv.click());
    expect(new URLSearchParams(window.location.search).has("lang")).toBe(false);
  });

  it("ignores a shared Hebrew URL when English is preferred", async () => {
    localStorage.setItem("wind-calendar:locale", "en");
    window.history.replaceState(null, "", "/?lang=he&locations=beit-yanai");
    await act(async () => root.render(createElement(App)));

    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(new URLSearchParams(window.location.search).has("lang")).toBe(false);
  });

  it("restores the saved language when remounted without a language URL parameter", async () => {
    await act(async () => root.render(createElement(App)));
    const picker = container.querySelector<HTMLSelectElement>("#language-picker")!;
    await act(async () => {
      picker.value = "he";
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => root.unmount());
    await i18n.changeLanguage("en");
    root = createRoot(container);
    await act(async () => root.render(createElement(App)));

    expect(container.querySelector<HTMLSelectElement>("#language-picker")!.value).toBe("he");
    expect(i18n.language).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
    expect(new URLSearchParams(window.location.search).has("lang")).toBe(false);
  });

  it("keeps saved Hebrew when opening a shared English URL", async () => {
    localStorage.setItem("wind-calendar:locale", "he");
    window.history.replaceState(null, "", "/?lang=en&locations=tel-aviv");
    await act(async () => root.render(createElement(App)));

    expect(i18n.language).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
    expect(new URLSearchParams(window.location.search).has("lang")).toBe(false);
    expect(new URLSearchParams(window.location.search).get("locations")).toBe("tel-aviv");
  });

  it("restores configuration on popstate without changing language", async () => {
    await act(async () => root.render(createElement(App)));
    window.history.pushState(
      null,
      "",
      "/?locations=tel-aviv&model=om_gfs&windEnabled=true&waveEnabled=false&lang=he",
    );

    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));

    expect(i18n.language).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(new URLSearchParams(window.location.search).get("locations")).toBe("tel-aviv");
    expect(new URLSearchParams(window.location.search).has("lang")).toBe(false);
  });
});
