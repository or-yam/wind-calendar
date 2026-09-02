import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigForm } from "../../../src/components/ConfigForm";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const props = {
  locations: ["beit-yanai"],
  model: "om_gfs" as const,
  availableModels: [3, 45, 59, 117],
  windEnabled: true,
  windMin: 14,
  windMax: 35,
  waveEnabled: false,
  waveSource: "total" as const,
  waveHeightMin: 0.5,
  waveHeightMax: 5,
  wavePeriodMin: 0,
  minSessionHours: 2,
  wavesForecastEnabled: true,
  windguruForecastModelsEnabled: true,
  onLocationsChange: vi.fn(),
  onModelChange: vi.fn(),
  onWindEnabledChange: vi.fn(),
  onWindRangeChange: vi.fn(),
  onWaveEnabledChange: vi.fn(),
  onWaveSourceChange: vi.fn(),
  onWaveHeightMinChange: vi.fn(),
  onWaveHeightMaxChange: vi.fn(),
  onWavePeriodMinChange: vi.fn(),
  onMinSessionHoursChange: vi.fn(),
};

describe("ConfigForm", () => {
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

  it("keeps model selection under Advanced and explains the main filters", async () => {
    await act(async () => root.render(createElement(ConfigForm, props)));

    const advanced = [...container.querySelectorAll("details")].find((details) =>
      details.querySelector("summary")?.textContent?.includes("Advanced"),
    );
    expect(advanced).toBeDefined();
    expect(advanced?.querySelector("label")?.textContent).toContain("Forecast Model");
    expect(advanced?.hasAttribute("open")).toBe(false);
    expect(container.textContent).toContain("wind stays within your preferred speed range");
    expect(container.textContent).toContain("wave height and period match");
    expect(container.textContent).toContain("Ignore short weather windows");
  });

  it("updates single-value ranges while they move and caps waves at 3 meters", async () => {
    const onWavePeriodMinChange = vi.fn();
    const onMinSessionHoursChange = vi.fn();
    await act(async () =>
      root.render(
        createElement(ConfigForm, {
          ...props,
          waveEnabled: true,
          onWavePeriodMinChange,
          onMinSessionHoursChange,
        }),
      ),
    );

    const ranges = [...container.querySelectorAll<HTMLInputElement>('input[type="range"]')];
    const waveMax = ranges.find(
      (range) => range.max === "3" && range.getAttribute("aria-valuetext")?.includes("end"),
    );
    const minPeriod = ranges.find((range) => range.max === "20");
    const minSession = ranges.find((range) => range.getAttribute("aria-labelledby"));

    expect(waveMax?.max).toBe("3");
    await act(async () => {
      minPeriod?.dispatchEvent(new InputEvent("input", { bubbles: true }));
      minPeriod?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      minSession?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(onWavePeriodMinChange).toHaveBeenCalledWith(1);
    expect(onMinSessionHoursChange).toHaveBeenCalledWith(2.5);
  });

  it("commits wind range changes as an atomic pair", async () => {
    const onWindRangeChange = vi.fn();
    await act(async () => root.render(createElement(ConfigForm, { ...props, onWindRangeChange })));

    const minimum = container.querySelector<HTMLInputElement>("#wind-min")!;
    const maximum = container.querySelector<HTMLInputElement>("#wind-max")!;
    await act(async () => {
      minimum.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    await act(async () => {
      maximum.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    });

    expect(onWindRangeChange).toHaveBeenNthCalledWith(1, [13, 35]);
    expect(onWindRangeChange).toHaveBeenNthCalledWith(2, [13, 36]);
  });

  it("hides wave controls when the Waves forecast flag is disabled", async () => {
    await act(async () =>
      root.render(createElement(ConfigForm, { ...props, wavesForecastEnabled: false })),
    );

    expect(container.textContent).not.toContain("Waves");
    expect(container.querySelector('[aria-label="Toggle wave forecast"]')).toBeNull();
  });

  it("hides Windguru models when their feature flag is disabled", async () => {
    await act(async () =>
      root.render(createElement(ConfigForm, { ...props, windguruForecastModelsEnabled: false })),
    );

    const advanced = container.querySelector("details")!;
    advanced.open = true;
    const trigger = advanced.querySelector<HTMLButtonElement>("button")!;
    await act(async () => trigger.click());

    expect(document.body.textContent).not.toContain("Windguru");
  });
});
