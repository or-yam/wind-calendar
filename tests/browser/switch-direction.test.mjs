import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

const env = {
  ...process.env,
  AGENT_BROWSER_SESSION: process.env.AGENT_BROWSER_SESSION ?? `rtl-switch-${randomUUID()}`,
  AGENT_BROWSER_JSON: "false",
};
const run = (...args) =>
  execFileSync("agent-browser", args, { encoding: "utf8", env, timeout: 30_000 }).trim();
const waveSwitch =
  '[role="switch"][aria-label="Toggle wave forecast"], [role="switch"][aria-label="הפעלת תחזית גלים"]';

const measure = () =>
  JSON.parse(
    run(
      "eval",
      `(async () => {
        const track = document.querySelector(${JSON.stringify(waveSwitch)});
        const thumb = track.querySelector('span');
        await new Promise(requestAnimationFrame);
        await Promise.allSettled(thumb.getAnimations().map(animation => animation.finished));
        const bounds = track.getBoundingClientRect();
        const position = thumb.getBoundingClientRect();
        const style = getComputedStyle(track);
        return {
          checked: track.getAttribute('aria-checked'), direction: style.direction,
          start: bounds.left + parseFloat(style.borderLeftWidth),
          end: bounds.right - parseFloat(style.borderRightWidth),
          left: position.left, right: position.right, width: position.width,
          waveEnabled: new URLSearchParams(location.search).get('waveEnabled')
        };
      })()`,
    ),
  );

test("switch thumb aligns with the track edges in LTR and RTL", async (t) => {
  assert.ok(process.env.PREVIEW_URL, "Set PREVIEW_URL to the Vercel preview URL");
  const url = new URL(process.env.PREVIEW_URL);
  url.search = "windEnabled=true&waveEnabled=false";
  const routes = ["**/api/features", "**/api/forecast**"];
  try {
    run("network", "route", routes[0], "--body", JSON.stringify({ wavesForecast: true }));
    run("network", "route", routes[1], "--body", JSON.stringify({ sessions: [] }));
    run("open", url.href);
    run("wait", waveSwitch);
    for (const width of [390, 1280]) {
      run("set", "viewport", String(width), "844");
      for (const [locale, direction] of [
        ["en", "ltr"],
        ["he", "rtl"],
      ]) {
        await t.test(`${locale} at ${width}px`, () => {
          run("select", "#language-picker", locale);
          for (const [index, checked] of [false, true, false].entries()) {
            if (index > 0) run("click", waveSwitch);
            const state = measure();
            assert.equal(state.checked, String(checked));
            assert.equal(state.waveEnabled, String(checked));
            assert.equal(state.direction, direction);
            assert.ok(state.width > 0);
            assert.ok(state.left >= state.start - 1 && state.right <= state.end + 1);
            const alignRight = checked ? direction === "ltr" : direction === "rtl";
            const actual = alignRight ? state.right : state.left;
            const expected = alignRight ? state.end : state.start;
            assert.ok(Math.abs(actual - expected) < 1, JSON.stringify({ checked, ...state }));
          }
        });
      }
    }
  } finally {
    for (const route of routes) run("network", "unroute", route);
    if (!process.env.AGENT_BROWSER_SESSION) run("close");
  }
});
