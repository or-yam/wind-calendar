import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCalendarApp } from "../helpers/calendar-app-render";

let app: ReturnType<typeof createCalendarApp>;
beforeEach(() => {
  app = createCalendarApp();
});
afterEach(() => app.cleanup());

const subscriptionUrls = () =>
  [
    ...app.container.querySelectorAll<HTMLAnchorElement>(
      'a[href^="webcal:"], a[href^="https://calendar.google.com/"], a[href^="https://outlook.live.com/"]',
    ),
  ].map((link) => link.href);

it("persists language locally without changing configuration, subscriptions, or forecast requests", async () => {
  await app.render();
  await app.editFilter();
  const url = window.location.href;
  const subscriptions = subscriptionUrls();
  const forecast = app.forecastCalls.at(-1)!.toString();
  expect(new URL(url).searchParams.get("waveHeightMin")).toBe("0.6");
  expect(new URL(url).searchParams.toString()).toBe(forecast);
  expect(new URLSearchParams(forecast).has("lang")).toBe(false);
  expect(subscriptions).toHaveLength(3);
  for (const href of subscriptions) {
    const provider = new URL(href);
    expect(provider.searchParams.has("lang")).toBe(false);
    const feed = new URL(
      provider.searchParams.get("cid") ?? provider.searchParams.get("url") ?? href,
    );
    expect(feed.searchParams.toString()).toBe(forecast);
  }

  for (const { locale, direction, heading } of [
    { locale: "he", direction: "rtl", heading: "בחירת תנאים" },
    { locale: "en", direction: "ltr", heading: "Choose your conditions" },
  ]) {
    const requests = app.forecastCalls.map((params) => params.toString());
    const picker = app.container.querySelector<HTMLSelectElement>("#language-picker")!;
    await act(async () => {
      picker.value = locale;
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => vi.advanceTimersByTimeAsync(600));

    expect(localStorage.getItem("wind-calendar:locale")).toBe(locale);
    expect(document.documentElement.lang).toBe(locale);
    expect(document.documentElement.dir).toBe(direction);
    expect(app.container.querySelector("#conditions-heading")?.textContent).toBe(heading);
    expect(window.location.href).toBe(url);
    expect(subscriptionUrls()).toEqual(subscriptions);
    expect(app.forecastCalls.map((params) => params.toString())).toEqual(requests);

    await app.reload();
    expect(app.container.querySelector<HTMLSelectElement>("#language-picker")!.value).toBe(locale);
    expect(document.documentElement.lang).toBe(locale);
    expect(document.documentElement.dir).toBe(direction);
    expect(window.location.href).toBe(url);
    expect(subscriptionUrls()).toEqual(subscriptions);
    expect(app.forecastCalls.at(-1)!.toString()).toBe(forecast);
  }
});
