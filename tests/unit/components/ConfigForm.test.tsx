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
});
