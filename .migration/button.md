# button

2026-08-13, transformation engine, migrated to the Base UI Button primitive.

## Changed

`src/components/ui/button.tsx`: replaced Radix Slot composition with Base UI Button while preserving variants. Leftover scan for `radix-ui|@radix-ui` is clean.

## Left alone

Button consumers did not use `asChild`, so no call sites changed.

## Behavior changes

## Verify by hand

Activate forecast navigation and form buttons by mouse and keyboard; confirm focus styles and disabled behavior.
