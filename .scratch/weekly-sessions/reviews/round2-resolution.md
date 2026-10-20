# Standards review round 2 resolution

## S8/P3 — mobile details focus fallback coverage

Updated `ForecastCalendar.mobile-details.test.tsx` so Friday remains the selected day while a Saturday overnight segment opens details. Switching to Day mode keeps Friday visible and removes the Saturday trigger. The test asserts the Saturday trigger is disconnected, closes details, and verifies focus returns to the Friday segment of the same session.

The existing implementation passes the regression test. As a sensitivity check, I temporarily disabled only the disconnected-trigger fallback in `CalendarGrid.tsx`; the new test failed with `document.activeElement` equal to `<body>`. The production source was restored before verification and is not part of this change.

This is a test coverage correction, not a runtime behavior fix. It exercises rendered public controls and does not call private helpers or assert component structure/styles.

The main-worktree TDD skill file was not present in the accessible filesystem paths when checked; the approved plan's rendered-calendar testing boundary was followed.
