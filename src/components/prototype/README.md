# Main-page layout drafts — throwaway

Question: where should conditions and calendar subscription sit so setup is obvious and quick?

Run `pnpm dev`, then use the Portless URL printed in the terminal:

- `/?variant=A`: one conditions panel with subscription actions in its footer.
- `/?variant=B`: conditions beside a subscription summary and provider buttons; stacked on mobile.
- `/?variant=C`: three collapsible steps on the same page.
- `/` without `variant`: original page for comparison.

Use the floating arrows, or left/right keys outside interactive controls, to switch drafts.
Conditions persist in URL params when switching or reloading. Guided step and simulated
action feedback live in memory. Each variant logs its current configuration to the console.

All drafts use the real condition controls and forecast API. Provider, copy, and download
buttons simulate actions; they do not open a calendar, copy a URL, or download a file.
No calendar image is included in any draft's hero. The draft entry point is development-only.

No winner is selected. Keep this exploration on `prototype/calendar-sync-layouts`;
rewrite the chosen layout for production once a direction is agreed.
