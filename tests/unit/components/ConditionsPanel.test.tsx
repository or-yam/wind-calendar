import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../../shared/constants";
import type { ConditionsPanelProps } from "../../../src/components/ConditionsPanel";

import { ConditionsPanel } from "../../../src/components/ConditionsPanel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const props = {
  ...DEFAULTS,
  locations: [...DEFAULTS.locations],
  availableModels: [],
  confirmedConfig: { ...DEFAULTS, locations: ["tel-aviv"] },
  confirmationPending: false,
  onConfirmConfig: vi.fn(),
  onLocationsChange: vi.fn(),
  onModelChange: vi.fn(),
  onWindEnabledChange: vi.fn(),
  onWindRangeChange: vi.fn(),
  onWaveEnabledChange: vi.fn(),
  onWaveSourceChange: vi.fn(),
  onWaveHeightRangeChange: vi.fn(),
  onWavePeriodMinChange: vi.fn(),
  onMinSessionHoursChange: vi.fn(),
  onFreeTextConfig: vi.fn(),
  freeTextConfigBuilderEnabled: true,
  wavesForecastEnabled: true,
  windguruForecastModelsEnabled: true,
} satisfies ConditionsPanelProps;

const renderPanel = (root: Root, panelProps: ConditionsPanelProps) =>
  root.render(
    createElement(
      QueryClientProvider,
      { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
      createElement(ConditionsPanel, panelProps),
    ),
  );

describe("ConditionsPanel", () => {
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
  });

  it("keeps the conditions section labelled and the free-text builder feature-flagged", async () => {
    await act(async () => renderPanel(root, props));

    const heading = container.querySelector("h2")!;
    expect(heading.textContent).toBe("Choose your conditions");
    expect(heading.closest("section")?.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(container.querySelector("#free-text-config-request")).not.toBeNull();
    expect(container.textContent).toContain("Add to your calendar");
    expect(container.textContent).not.toContain("Your conditions, on your schedule.");
  });

  it("hides the free-text builder when its feature flag is off", async () => {
    await act(async () => renderPanel(root, { ...props, freeTextConfigBuilderEnabled: false }));

    expect(container.querySelector("#free-text-config-request")).toBeNull();
  });

  it("exposes five real, accessible calendar actions", async () => {
    await act(async () => renderPanel(root, props));

    const group = container.querySelector('[role="group"][aria-label="Calendar actions"]')!;
    const actions = [...group.querySelectorAll("a, button")];
    expect(actions.map((action) => action.getAttribute("aria-label"))).toEqual([
      "Apple Calendar",
      "Google Calendar",
      "Outlook",
      "Copy subscription URL",
      "Download .ics",
    ]);
    expect(actions.every((action) => action.getAttribute("title"))).toBe(true);

    const [apple, google, outlook] = [...group.querySelectorAll("a")];
    expect(apple.href).toMatch(/^webcal:/);
    expect(apple.href).toContain("locations=tel-aviv");
    expect(google.href).toContain("https://calendar.google.com/");
    expect(google.getAttribute("rel")).toBe("noopener noreferrer");
    expect(outlook.href).toContain("https://outlook.live.com/");
    expect(outlook.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("shows recognizable provider names and icons on the direct calendar links", async () => {
    await act(async () => renderPanel(root, props));

    const links = [
      ...container.querySelectorAll<HTMLAnchorElement>('[aria-label="Calendar actions"] a'),
    ];
    expect(links.map((link) => link.textContent?.trim())).toEqual(["Apple", "Google", "Outlook"]);
    expect(links.every((link) => link.querySelector("img")?.getAttribute("src"))).toBe(true);
    expect(links[0].href).toMatch(/^webcal:/);
    expect(links[1].href).toContain("calendar.google.com");
    expect(links[2].href).toContain("outlook.live.com");
  });

  it("keeps the minimum and maximum wind controls at their 5–50 knot bounds", async () => {
    const onWindRangeChange = vi.fn();
    await act(async () =>
      renderPanel(root, { ...props, windMin: 5, windMax: 50, onWindRangeChange }),
    );

    const minimum = container.querySelector<HTMLInputElement>("#wind-min")!;
    const maximum = container.querySelector<HTMLInputElement>("#wind-max")!;
    const decreaseMinimum = container.querySelector<HTMLButtonElement>(
      '[aria-label="Decrease minimum wind speed"]',
    )!;
    const increaseMaximum = container.querySelector<HTMLButtonElement>(
      '[aria-label="Increase maximum wind speed"]',
    )!;
    expect(minimum.value).toBe("5");
    expect(maximum.value).toBe("50");
    expect(decreaseMinimum.disabled).toBe(true);
    expect(increaseMaximum.disabled).toBe(true);
    await act(async () => {
      decreaseMinimum.click();
      increaseMaximum.click();
    });
    expect(onWindRangeChange).not.toHaveBeenCalled();
  });

  it("only shows the confirmation control while configuration review is pending", async () => {
    const onConfirmConfig = vi.fn();
    await act(async () =>
      renderPanel(root, { ...props, confirmationPending: true, onConfirmConfig }),
    );

    const confirm = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Confirm configuration",
    )!;
    await act(async () => confirm.click());
    expect(onConfirmConfig).toHaveBeenCalledOnce();
  });
});
