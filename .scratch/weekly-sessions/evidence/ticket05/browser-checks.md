# Ticket 05 browser checks

Checked the local app through the ticket 02 worked forecast fixture in an isolated `agent-browser` session, served by Portless at the ticket worktree URL. The initial local Vite session returned 404 for API routes; a later server restart served live data. For repeatable visual checks, the worked fixture was supplied at the browser fetch boundary.

## Results

- 320px and 390px show three day columns and fit the document to the viewport. 768px and 1280px show seven day columns; the document also stays within each viewport.
- The real time range expanded to include the fixture’s early, late, and overnight events. At 320px the five-hour Friday combined event is 200px tall (40px/hour); at 768px and 1280px it is 180px (36px/hour). The 36px desktop scale already matched the desktop reference. Keeping forecast time boundaries makes these views taller than the static mockups’ sample ranges.
- The Friday fixture has three simultaneous lanes. At 320px, each lane is about 23px wide; the original wind and wave labels were clipped there. Narrow lanes now show compact, separately colored `W` and `≈` badges. The complete condition values remain in each event’s accessible name and in the details panel. Wider, non-overlapping blocks retain full value labels.
- Keyboard focus plus Enter opened the combined session details, including separate wind and wave directions, gusts, and swell. Closing returned focus to the event. Resizing from 320px through 768px to 1280px kept the selected date and details open.
- The Friday equal-start and nested events stayed within the calendar bounds at all four widths. The compact badge area has no internal horizontal overflow.

Screenshots: `final-320.png`, `final-390.png`, `final-768.png`, `final-1280.png`; selected details at `details-320.png` and `details-1280.png`.
