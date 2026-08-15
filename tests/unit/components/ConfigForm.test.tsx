import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigForm } from "../../../src/components/ConfigForm";
import { DirectionProvider } from "../../../src/components/ui/direction";
import i18n, { applyDocumentLocale } from "../../../src/i18n";

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
      (range) => range.max === "3" && range.getAttribute("aria-label") === "Maximum wave height",
    );
    const minPeriod = ranges.find((range) => range.max === "20");
    const minSession = ranges.find((range) => range.max === "8");

    expect(waveMax?.max).toBe("3");
    await act(async () => {
      minPeriod?.dispatchEvent(new InputEvent("input", { bubbles: true }));
      minPeriod?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      minSession?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(onWavePeriodMinChange).toHaveBeenCalledWith(1);
    expect(onMinSessionHoursChange).toHaveBeenCalledWith(2.5);
  });

  it("localizes Base UI controls and reverses horizontal slider keys in RTL", async () => {
    const onMinSessionHoursChange = vi.fn();
    await i18n.changeLanguage("he");
    applyDocumentLocale("he");
    await act(async () =>
      root.render(
        createElement(
          DirectionProvider,
          { direction: "rtl" },
          createElement(ConfigForm, { ...props, onMinSessionHoursChange }),
        ),
      ),
    );

    const minSession = [
      ...container.querySelectorAll<HTMLInputElement>('input[type="range"]'),
    ].find((range) => range.getAttribute("aria-label") === "משך גלישה מינימלי")!;
    expect(minSession.getAttribute("aria-valuetext")).toContain("שעות");
    await act(async () =>
      minSession.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })),
    );
    expect(onMinSessionHoursChange).toHaveBeenCalledWith(1.5);
    expect(container.querySelector("[data-checked] > span")?.className).toContain(
      "rtl:data-checked:-translate-x-[20px]",
    );
  });

  it("opens and operates the portaled model select in RTL", async () => {
    const onModelChange = vi.fn();
    await i18n.changeLanguage("he");
    applyDocumentLocale("he");
    await act(async () =>
      root.render(
        createElement(
          DirectionProvider,
          { direction: "rtl" },
          createElement(ConfigForm, { ...props, onModelChange }),
        ),
      ),
    );

    container.querySelector("details")!.open = true;
    await act(async () => container.querySelector<HTMLElement>("#model")!.click());
    const listbox = document.body.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(listbox).not.toBeNull();
    expect(getComputedStyle(listbox).direction).toBe("rtl");

    await act(async () =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      ),
    );
    await act(async () => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(onModelChange).toHaveBeenCalledWith("om_icon");
  });
});
