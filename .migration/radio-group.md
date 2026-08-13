# radio-group

2026-08-13, transformation engine, migrated group and radio parts to Base UI.

## Changed

`src/components/ui/radio-group.tsx`: replaced Radix Root/Item/Indicator with Base UI RadioGroup and Radio parts and updated disabled selectors. Leftover scan for `radix-ui|@radix-ui` is clean.

## Left alone

Consumer callback shape remains compatible.

## Behavior changes

Radio items now render Base UI's span and hidden-input anatomy rather than buttons.

## Verify by hand

Select wave source by click and arrow keys; confirm the selected indicator and submitted value.
