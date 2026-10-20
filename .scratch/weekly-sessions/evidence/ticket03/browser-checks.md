# Ticket 03 browser evidence

Checked the local app at `https://a732af2a.wind-calendar.localhost:1355/` with the live forecast API.

- At 320px and 390px, the page had no horizontal overflow. The default mobile calendar showed three columns and the seven day buttons.
- Enabled wave conditions in the URL and confirmed the combined Thursday Beit Yanai session displayed wind and wave badges in both three-day and Day modes. Both badges fit at 320px and 390px.
- Selected Thursday, opened its session details, resized to 1280px (seven columns), then returned to 390px. The selected date, event, and details remained visible.
- The mobile Previous control moved from Wednesday back to Sunday within the current week, then disabled at the Sunday lower bound (rendered navigation test).
- At 1280px, the grid showed seven days and the mobile date strip was absent. Page width remained 1280px.

Screenshots: `three-day-320.png`, `three-day-390.png`, `day-320.png`, `day-390.png`.

## Test progression

The first new rendered mobile behavior test failed because mobile rendered one day (expected three). After replacing the fallback, rendered navigation and accessibility tests passed. The final full run passed all 49 suites and 607 tests. `pnpm check` and `pnpm build` both passed.
