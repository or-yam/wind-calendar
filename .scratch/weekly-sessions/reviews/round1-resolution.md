# Weekly sessions review resolution · round 1

Task worktree: `t3-0a251680`, pinned integration base `32159f7e5a5e4e9dd76b1c58460472c29749440b`.

## Standards findings

- **Implementation-coupled tests — resolved.** Replaced exact `calc(...)`/inline-style checks and `nth-child`/class-name queries with event names, date/time content, accessible conditions, actions, and focus assertions. Layout relationships are checked at the approved browser boundary below. Rendered calendar tests are split into behavior-focused files; all are under 100 lines and use `tests/helpers/forecast-calendar-render.tsx` where shared setup is useful.
- **Keyboard assertion regression — resolved.** Accessibility coverage asserts the native event button has `tabIndex === 0`.
- **Component styles in global CSS — resolved.** Removed component-specific global container rules; compact presentation uses named Tailwind container-query classes in `SessionBadges`/`SessionEvent`.
- **Conditional classes bypass `cn()` — resolved.** `CalendarMobileControls` uses `cn()`.
- **Listener cleanup — resolved.** Both `matchMedia` and resize listeners share one `AbortController` signal; unsubscribe aborts it.
- **File-size guideline — resolved.** `ForecastCalendar.tsx`, `DayColumn.tsx`, `SessionEvent.tsx`, extracted calendar components/hooks, and every focused rendered calendar test are below 100 lines.
- **Duplicated condition formatting — resolved.** Shared wind and wave range labels serve both event badges and details.

## Spec findings

- **Mobile arrows — resolved.** Movement uses the clamped visible-range start. Rendered navigation selects Saturday from Thu–Sat and verifies Previous starts Monday. Browser reproduction at 390px also moved Thu–Sat to Mon–Wed.
- **Mobile hour grid — resolved.** Gradient stops derive from `hourHeight`. Browser computed style at 320px was 39px transparent plus a 1px line for the 40px mobile scale.
- **Details focus return — resolved.** When the original trigger unmounts, close locates a currently rendered event button for the same session. Rendered coverage switches to Day and confirms focus returns to its remaining Saturday segment.
- **DST rollback and spring-forward geometry and axis — resolved.** A week containing an offset transition uses one shared elapsed-hours-since-local-midnight axis for every day column. The axis is labeled in elapsed hours, and a visible note explains the clock-change week. Event segments use clipped source instants and elapsed duration; event and detail times show local clocks with `UTC±HH:MM` offsets. Ordinary weeks retain the local wall-clock axis. Rendered coverage includes the Asia/Jerusalem rollback fixture, a Berlin spring-forward fixture, and Lord Howe’s half-hour offset transition.

## Browser evidence

Used a controlled forecast response in `agent-browser` against the worktree's `portless` app. At 1280px on the transition week, DOM bounding boxes showed:

- Equal-start sessions share a top coordinate and occupy separate horizontal lanes; the nested interval occupies a third lane.
- The adjacent interval begins at the prior event's bottom coordinate and returns to full column width.
- Three- and five-hour events measured 108px and 180px at 36px per elapsed hour; the nested one-hour event measured 36px.
- The 06:15 fractional event starts 6.25 elapsed hours from local midnight and measured 18px for its 30-minute duration.
- The overnight session measured 36px for its Sunday 23:00–midnight piece and 108px for its Monday midnight–03:00 piece.
- The rollback fixture measured 27px, exactly 45 minutes at 36px/hour. Its accessible label and details read `01:30 UTC+03:00 – 01:15 UTC+02:00`.
- The transition-week scale labeled elapsed hours through `25h` and displayed the clock-change note.
- At 320px and 390px the 45-minute block measured 30px at 40px/hour; at 768px and 1280px it measured 27px at 36px/hour.

At 320, 390, 768, and 1280px, `documentElement.scrollWidth` matched the viewport width; measured calendar widths were 288, 358, 732, and 1080px. At 320px the grid showed three day columns and used the 40px mobile line interval.

## Verification and handoff

- `pnpm check`: **58 suites, 613 tests passed**.
- `pnpm build`: passed.
- No provider/API changes. No push, deploy, or PR.
- All local round-one findings are resolved. Independent Sol re-review and parent Vercel preview QA remain pending by request.
