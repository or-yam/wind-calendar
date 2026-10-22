import { useLayoutEffect, useRef, type RefObject } from "react";

export function useCalendarTodayFocus(
  calendarRef: RefObject<HTMLDivElement | null>,
  isPending: boolean,
) {
  const shouldFocus = useRef(false);
  useLayoutEffect(() => {
    if (!shouldFocus.current || isPending) return;
    calendarRef.current
      ?.querySelector<HTMLElement>('[data-today="true"]')
      ?.focus({ preventScroll: true });
    shouldFocus.current = false;
  });
  return () => {
    shouldFocus.current = true;
  };
}
