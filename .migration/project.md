# project

2026-08-13, whole-project transformation-engine migration completed.

## Changed

Installed `@base-ui/react`, migrated all eight Radix-backed wrappers and their consumers, removed all eight direct Radix dependencies, and installed the `migrate-radix-to-base` skill at project scope. Source leftover scan for `radix-ui|@radix-ui` is clean.

## Left alone

Non-Radix UI wrappers and unrelated application code were intentionally untouched. Legacy `components.json` style remains `default` because no `base-default` registry style exists; future `shadcn add` commands may still install Radix variants.

## Behavior changes

See each component report. Notable differences are Base UI slider commit and thumb-collision behavior, semantic separators, and generic-element form-control roots.

## Verify by hand

Exercise the full configuration form and FAQ with pointer and keyboard on desktop and mobile widths.
