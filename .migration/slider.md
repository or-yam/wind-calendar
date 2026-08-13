# slider

2026-08-13, transformation engine, migrated range and single-value sliders to Base UI.

## Changed

`src/components/ui/slider.tsx`: added required Control anatomy, renamed Range to Indicator, indexed thumbs, and updated disabled selectors. `src/components/ConfigForm.tsx`: renamed `onValueCommit` to `onValueCommitted`. Leftover scan for `radix-ui|@radix-ui` is clean.

## Left alone

Existing value arrays and visual classes were preserved.

## Behavior changes

Base UI does not emit a commit event when the value did not change and defaults to push behavior when range thumbs collide.

## Verify by hand

Drag and keyboard-adjust every slider; confirm live labels update and committed settings persist after release or keyup.
