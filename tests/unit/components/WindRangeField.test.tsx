import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WindRangeField } from "../../../src/components/WindRangeField";
import { DirectionProvider } from "../../../src/components/ui/direction";
import i18n, { applyDocumentLocale } from "../../../src/i18n";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
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

it("localizes the wind steppers and validation while keeping valid changes atomic in RTL", async () => {
  await i18n.changeLanguage("he");
  applyDocumentLocale("he");
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      createElement(
        DirectionProvider,
        { direction: "rtl" },
        createElement(WindRangeField, { min: 14, max: 35, onChange }),
      ),
    ),
  );
  expect(container.querySelector("legend")?.textContent).toBe("טווח מהירות רוח בקשרים");
  expect(container.querySelector('button[aria-label="הקטנת מהירות רוח מינימלית"]')).not.toBeNull();
  const input = container.querySelector<HTMLInputElement>("#wind-min")!;
  expect(input.dir).toBe("ltr");
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })),
  );
  expect(onChange).toHaveBeenCalledWith([13, 35]);
  await act(async () => root.render(createElement(WindRangeField, { min: 35, max: 14, onChange })));
  expect(container.querySelector("#wind-range-error")?.textContent).toBe(
    "המינימום חייב להיות נמוך מהמקסימום בקשר אחד לפחות.",
  );
  expect(container.querySelector("#wind-min")?.getAttribute("aria-invalid")).toBe("true");
});
