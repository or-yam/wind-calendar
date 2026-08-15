import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../src/i18n";

vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: (options: { queryKey: string[] }) =>
    options.queryKey[0] === "features"
      ? { data: { freeTextConfigBuilder: true }, isPending: false, error: null }
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

  it("renders an accessible language picker before the hero controls", async () => {
    await act(async () => root.render(createElement(App)));

    const picker = container.querySelector<HTMLSelectElement>("#language-picker")!;
    expect(container.querySelector('label[for="language-picker"]')?.textContent).toBe("Language");
    expect(container.querySelector("select, button")).toBe(picker);
    expect(picker.value).toBe("en");
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
    expect(new URLSearchParams(window.location.search).get("lang")).toBe("he");

    const addTelAviv = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.startsWith("Add Tel Aviv"),
    )!;
    await act(async () => addTelAviv.click());
    expect(new URLSearchParams(window.location.search).get("lang")).toBe("he");
  });

  it("falls back to English for unsupported locales", async () => {
    window.history.replaceState(null, "", "/?lang=fr&locations=beit-yanai");
    await act(async () => root.render(createElement(App)));

    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(new URLSearchParams(window.location.search).has("lang")).toBe(false);
  });

  it("restores locale and configuration on popstate", async () => {
    await act(async () => root.render(createElement(App)));
    window.history.pushState(
      null,
      "",
      "/?locations=tel-aviv&model=om_gfs&windEnabled=true&waveEnabled=false&lang=he",
    );

    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));

    expect(i18n.language).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
    expect(new URLSearchParams(window.location.search).get("locations")).toBe("tel-aviv");
    expect(new URLSearchParams(window.location.search).get("lang")).toBe("he");
  });
});
