// Paste functions into chrome-devtools evaluate_script on the local QA page.
// Mock only browser fetch, never app/server files. Install before changing settings.
window.installForecastMock = function installForecastMock() {
  window.__qaFetch = [];
  const native = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const url = new URL(String(args[0]), location.href);
    if (url.pathname === "/api/forecast") {
      window.__qaFetch.push({ url: url.href, time: performance.now() });
      const start = new Date();
      start.setHours(12, 0, 0, 0);
      return new Response(
        JSON.stringify({
          sessions: [
            {
              start: start.toISOString(),
              end: new Date(+start + 10800000).toISOString(),
              location: { id: "beit-yanai", label: "QA synthetic 20kn" },
              wind: { min: 20, max: 20, direction: "W" },
              wave: { avgHeight: 1, avgPeriod: 8, direction: "W" },
              matchType: "wind",
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      );
    }
    if (url.pathname.startsWith("/api/")) throw Error("QA blocks other API calls");
    return native(...args);
  };
};

window.drag = async function drag(selector, startFraction, fractions, delay) {
  const input = document.querySelector(selector),
    thumb = input.parentElement;
  const control = thumb.parentElement;
  control.scrollIntoView({ block: "center" });
  const rect = control.getBoundingClientRect();
  const emit = (target, type, fraction, buttons) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 0,
        pointerType: "mouse",
        isPrimary: true,
        clientX: rect.x + rect.width * fraction,
        clientY: rect.y + rect.height / 2,
        button: 0,
        buttons,
      }),
    );
  const trace = [],
    base = window.__qaFetch.length;
  const sample = (phase) =>
    trace.push({
      phase,
      time: performance.now(),
      value: input.value,
      url: location.href,
      week: document.querySelector("nav").innerText,
      requests: window.__qaFetch.length - base,
    });
  sample("before");
  emit(thumb, "pointerdown", startFraction, 1);
  for (const [i, fraction] of fractions.entries()) {
    emit(document, "pointermove", fraction, 1);
    await new Promise((resolve) => setTimeout(resolve, delay));
    sample("tick" + i);
  }
  emit(document, "pointerup", fractions.at(-1), 0);
  sample("release");
  await new Promise((resolve) => setTimeout(resolve, 700));
  sample("settled");
  return { trace, requests: window.__qaFetch.slice(base) };
};
