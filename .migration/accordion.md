# accordion

2026-08-13, transformation engine, migrated to Base UI and consumer props updated.

## Changed

`src/components/ui/accordion.tsx`: replaced Radix parts with Base UI, renamed Content to Panel, and updated state selectors. `src/components/Caveats.tsx`: removed Radix-only root props. Leftover scan for `radix-ui|@radix-ui` is clean.

## Left alone

No related files were intentionally left unchanged.

## Behavior changes

Base UI single accordions are always collapsible, matching this consumer's explicit Radix configuration.

## Verify by hand

Open and close each FAQ item; confirm only one is open and the chevron rotates.
