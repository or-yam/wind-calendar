import { useSyncExternalStore } from "react";

const query = "(max-width: 767px)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(query);
  const controller = new AbortController();
  media?.addEventListener("change", onChange, { signal: controller.signal });
  window.addEventListener("resize", onChange, { signal: controller.signal });
  return () => controller.abort();
}

export function useMobileCalendar() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
