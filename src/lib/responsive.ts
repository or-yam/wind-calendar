export function getMobileMediaQuery() {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  const breakpoint = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue("--breakpoint-md")
    .trim();
  return breakpoint ? window.matchMedia(`(width < ${breakpoint})`) : null;
}

export function isMobileView() {
  return getMobileMediaQuery()?.matches ?? false;
}
