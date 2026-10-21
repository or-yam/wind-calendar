import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 767px)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(MOBILE_QUERY);
  const controller = new AbortController();
  media?.addEventListener("change", onChange, { signal: controller.signal });
  return () => controller.abort();
}

export function useMobileView() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(MOBILE_QUERY).matches ?? false,
    () => false,
  );
}
