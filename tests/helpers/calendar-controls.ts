export function calendarControls(container: HTMLElement) {
  return {
    button(name: string) {
      return [...container.querySelectorAll<HTMLButtonElement>("button")].find(
        (button) => (button.getAttribute("aria-label") ?? button.textContent) === name,
      )!;
    },
    visibleDays() {
      return [...container.querySelectorAll('[role="region"] [role="group"]')].map((day) =>
        day.getAttribute("aria-label")!.replace(": No sessions", ""),
      );
    },
    selectedDay() {
      return container
        .querySelector('[aria-label="Select day"] [aria-pressed="true"]')
        ?.getAttribute("aria-label");
    },
  };
}
