# select

2026-08-13, transformation engine, migrated the customized select wrapper to Base UI.

## Changed

`src/components/ui/select.tsx`: added Positioner/Popup/List anatomy, renamed group labels and scroll arrows, replaced `asChild` with `render`, and mapped CSS variables and transition states. `src/components/ConfigForm.tsx`: handles Base UI's nullable select value. Leftover scan for `radix-ui|@radix-ui` is clean.

## Left alone

Custom inline icons and visual classes were preserved.

## Behavior changes

The popup uses Base UI positioning and transition behavior; selected values still display their string value, as before for this model list.

## Verify by hand

Open the forecast model select; test keyboard navigation, typeahead, disabled options, scrolling, selection, and focus return.
