import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HeroProps } from "../../../src/components/Hero";

vi.mock("../../../src/components/canvasui/VHS", () => ({
  default: ({ children, speed }: { children: React.ReactNode; speed: number }) =>
    createElement("div", { "data-vhs-speed": speed }, children),
}));
vi.mock("../../../src/components/ConfigForm", () => ({ ConfigForm: () => null }));
vi.mock("../../../src/components/FreeTextConfigBuilder", () => ({
  FreeTextConfigBuilder: () => createElement("div", null, "Free-text config builder"),
}));

import { Hero } from "../../../src/components/Hero";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const props = {
  locations: ["beit-yanai"],
  model: "om_gfs",
  availableModels: [],
  windEnabled: true,
  windMin: 14,
  windMax: 35,
  waveEnabled: false,
  waveSource: "total",
  waveHeightMin: 0.5,
  waveHeightMax: 5,
  wavePeriodMin: 0,
  minSessionHours: 2,
  onLocationsChange: vi.fn(),
  onModelChange: vi.fn(),
  onWindEnabledChange: vi.fn(),
  onWindMinChange: vi.fn(),
  onWindMaxChange: vi.fn(),
  onWaveEnabledChange: vi.fn(),
  onWaveSourceChange: vi.fn(),
  onWaveHeightMinChange: vi.fn(),
  onWaveHeightMaxChange: vi.fn(),
  onWavePeriodMinChange: vi.fn(),
  onMinSessionHoursChange: vi.fn(),
  onFreeTextConfig: vi.fn(),
  freeTextConfigBuilderEnabled: true,
  wavesForecastEnabled: true,
  windguruForecastModelsEnabled: true,
} satisfies HeroProps;

describe("Hero feature flags", () => {
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

  it.each([
    [true, true],
    [false, false],
  ])("renders the free-text config builder when enabled is %s", async (enabled, visible) => {
    await act(async () =>
      root.render(createElement(Hero, { ...props, freeTextConfigBuilderEnabled: enabled })),
    );

    expect(container.textContent?.includes("Free-text config builder")).toBe(visible);
  });

  it("uses a clear conditions heading", async () => {
    await act(async () =>
      root.render(createElement(Hero, { ...props, freeTextConfigBuilderEnabled: false })),
    );

    expect(container.querySelector("h2")?.textContent).toBe("Choose your conditions");
  });

  it("uses the slower hero animation and concise tagline", async () => {
    await act(async () =>
      root.render(createElement(Hero, { ...props, freeTextConfigBuilderEnabled: false })),
    );

    expect(container.querySelector("[data-vhs-speed]")?.getAttribute("data-vhs-speed")).toBe("0.3");
    expect(container.textContent).toContain("Only the days worth surfing.");
    expect(container.textContent).not.toContain("No doom-scrolling the forecast.");
  });
});
