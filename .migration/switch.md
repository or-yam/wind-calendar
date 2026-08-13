# switch

2026-08-13, transformation engine, migrated to Base UI Switch.

## Changed

`src/components/ui/switch.tsx`: replaced Radix parts and mapped checked, unchecked, and disabled selectors. Leftover scan for `radix-ui|@radix-ui` is clean.

## Left alone

Existing controlled consumers and labels remain compatible.

## Behavior changes

The root now uses Base UI's span and hidden-input anatomy rather than a button.

## Verify by hand

Toggle wind and waves by pointer, keyboard, and label; confirm disabled state prevents changes.
