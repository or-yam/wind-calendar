import { useSyncExternalStore } from "react";
import { getMobileMediaQuery, isMobileView } from "@/lib/responsive";

function subscribe(onChange: () => void) {
  const media = getMobileMediaQuery();
  const controller = new AbortController();
  media?.addEventListener("change", onChange, { signal: controller.signal });
  return () => controller.abort();
}

export function useMobileView() {
  return useSyncExternalStore(subscribe, isMobileView, () => false);
}
