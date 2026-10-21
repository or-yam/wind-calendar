import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS } from "../../../shared/constants";
import type { ConditionsPanelProps } from "../../../src/components/ConditionsPanel";

vi.mock("../../../src/components/FreeTextConfigBuilder", () => ({
  FreeTextConfigBuilder: () => createElement("div", null, "Free-text config builder"),
}));

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
    await act(async () => root.render(createElement(ConditionsPanel, props)));

    const heading = container.querySelector("h2")!;
    expect(heading.textContent).toBe("Choose your conditions");
    expect(heading.closest("section")?.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(container.textContent).toContain("Free-text config builder");
    expect(container.textContent).toContain("Add to your calendar");
    expect(container.textContent).toContain("Your conditions, on your schedule.");
  });

  it("hides the free-text builder when its feature flag is off", async () => {
    await act(async () =>
      root.render(
        createElement(ConditionsPanel, { ...props, freeTextConfigBuilderEnabled: false }),
      ),
    );

    expect(container.textContent).not.toContain("Free-text config builder");
  });

  it("exposes five real, accessible calendar actions", async () => {
    await act(async () => root.render(createElement(ConditionsPanel, props)));

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

  it("only shows the confirmation control while configuration review is pending", async () => {
    const onConfirmConfig = vi.fn();
    await act(async () =>
      root.render(
        createElement(ConditionsPanel, { ...props, confirmationPending: true, onConfirmConfig }),
      ),
    );

    const confirm = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Confirm configuration",
    )!;
    await act(async () => confirm.click());
    expect(onConfirmConfig).toHaveBeenCalledOnce();
  });
});
