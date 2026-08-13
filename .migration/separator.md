# separator

2026-08-13, transformation engine, migrated to Base UI Separator.

## Changed

`src/components/ui/separator.tsx`: replaced Radix Separator and removed its unsupported decorative prop. Leftover scan for `radix-ui|@radix-ui` is clean.

## Left alone

No app code imports this standalone wrapper.

## Behavior changes

Base UI separators are always semantic rather than optionally decorative.

## Verify by hand

Confirm horizontal and vertical separator dimensions if the wrapper is added to a view.
