import { act } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import i18n, { applyDocumentLocale } from "../../../src/i18n";
import { createCalendarHarness, makeSession } from "../../helpers/forecast-calendar-render";

let calendar: ReturnType<typeof createCalendarHarness>;
beforeEach(() => {
  calendar = createCalendarHarness();
});
afterEach(() => calendar.cleanup());

it("switches an open session to Hebrew without losing details or changing weather directions", async () => {
  await calendar.render([makeSession("beit-yanai", 11, 15)]);
  const event = calendar.container.querySelector<HTMLButtonElement>("[data-session-key]")!;
  const windArrow = event.querySelector('[role="img"] [style]') as HTMLElement;
  const rotation = windArrow.style.transform;
  await act(async () => event.click());
  await act(async () => {
    await i18n.changeLanguage("he");
    applyDocumentLocale("he");
  });

  expect(calendar.container.querySelector("h2")?.textContent).toBe("חלונות גלישה קרובים");
  expect(calendar.container.querySelector(".week-range")?.textContent).toContain("אוק׳");
  expect(event.getAttribute("aria-label")).toContain("בבית ינאי: 11:00 – 15:00, רוח 18–24 קשר W");
  expect(event.querySelector(".session-event__wind")?.textContent).toBe("18–24 קשר");
  expect(event.querySelector(".session-event__time")?.getAttribute("dir")).toBe("ltr");
  expect(windArrow.style.transform).toBe(rotation);
  const details = calendar.container.querySelector<HTMLElement>('[aria-label="פרטי חלון גלישה"]')!;
  expect(details).not.toBeNull();
  expect(details.textContent).toContain("רוח 18–24 קשר");
  expect(details.textContent).toContain("משבים 30 קשר");
  expect(details.textContent).toContain("סוואל 0.8m 7s");
  expect(details.querySelector('bdi[dir="ltr"]')?.textContent).toBe("11:00 – 15:00");
  await act(async () => details.querySelector<HTMLButtonElement>("button")!.click());
  expect(document.activeElement).toBe(event);
});

it("localizes empty, loading and error announcements without exposing untranslated API messages", async () => {
  await i18n.changeLanguage("he");
  applyDocumentLocale("he");
  await calendar.render([]);
  expect(calendar.container.querySelector('[role="status"]')?.textContent).toBe(
    "אין חלונות גלישה מתאימים בשבוע הזה",
  );
  expect(calendar.container.querySelectorAll('[aria-label$=": אין חלונות גלישה"]')).toHaveLength(7);
  await calendar.render([], { isPending: true });
  expect(calendar.container.querySelector('[aria-busy="true"]')?.getAttribute("aria-label")).toBe(
    "יומן תחזית שבועי",
  );
  expect(calendar.container.querySelector('[role="status"]')?.textContent).toBe("התחזית נטענת");
  await calendar.render([], { error: new Error("Untranslated API failure") });
  expect(calendar.container.querySelector('[role="status"]')?.textContent).toBe(
    "לא ניתן לטעון את התחזית. נסו שוב.",
  );
  expect(calendar.container.textContent).not.toContain("Untranslated API failure");
});
