import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigForm } from "../../../src/components/ConfigForm";
import { WIND_DIRECTIONS } from "../../../shared/wind-directions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const props = {
  locations: ["beit-yanai"],
  model: "om_gfs" as const,
  availableModels: [3, 45, 59, 117],
  windEnabled: true,
  windMin: 14,
  windMax: 35,
  windDirections: [...WIND_DIRECTIONS],
  waveEnabled: false,
  waveSource: "total" as const,
  waveHeightMin: 0.5,
  waveHeightMax: 5,
  wavePeriodMin: 0,
  minSessionHours: 2,
  onLocationsChange: vi.fn(),
  onModelChange: vi.fn(),
  onWindEnabledChange: vi.fn(),
  onWindMinChange: vi.fn(),
  onWindMaxChange: vi.fn(),
  onWindDirectionsChange: vi.fn(),
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

  it("renders an accessible direction picker and emits canonical selections", async () => {
    const onWindDirectionsChange = vi.fn();
    await act(async () =>
      root.render(
        createElement(ConfigForm, {
          ...props,
          windDirections: ["N", "NW"],
          onWindDirectionsChange,
        }),
      ),
    );

    const east = container.querySelector<HTMLButtonElement>('button[aria-label="East"]')!;
    expect(container.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(2);
    await act(async () => east.click());
    expect(onWindDirectionsChange).toHaveBeenCalledWith(["N", "E", "NW"]);
    expect(container.textContent).toContain("Applies to all selected spots");
  });

  it("prevents removing the final direction and can restore all", async () => {
    const onWindDirectionsChange = vi.fn();
    await act(async () =>
      root.render(
        createElement(ConfigForm, {
          ...props,
          windDirections: ["W"],
          onWindDirectionsChange,
        }),
      ),
    );

    expect(container.querySelector<HTMLButtonElement>('button[aria-label="West"]')?.disabled).toBe(
      true,
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Select all wind directions"]')!
        .click(),
    );
    expect(onWindDirectionsChange).toHaveBeenCalledWith(WIND_DIRECTIONS);
  });
});
