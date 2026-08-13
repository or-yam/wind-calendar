# label

2026-08-13, transformation engine, replaced Radix Label with a native label.

## Changed

`src/components/ui/label.tsx`: now renders a native `<label>` with existing variants. Leftover scan for `radix-ui|@radix-ui` is clean.

## Left alone

Existing label consumers retain `htmlFor` associations.

## Behavior changes

Radix's double-click text-selection prevention is removed.

## Verify by hand

Click each form label and confirm its associated switch, radio, select, or slider receives focus.
