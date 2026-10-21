# React Compiler migration research

Researched 2026-10-21. Compiler integration implemented; remaining lint and coverage work is tracked below.

## Recommendation

Use the stable Babel React Compiler through `@rolldown/plugin-babel` and `reactCompilerPreset`. React calls the compiler stable and encourages adoption. This recommendation selects the established implementation over Vite’s explicitly experimental native integration. React 19 alone does not enable this build transform. [React introduction](https://react.dev/learn/react-compiler/introduction), [React installation](https://react.dev/learn/react-compiler/installation), [Vite plugin README](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#react-compiler)

Current setup: Vite ^8.3.5, @vitejs/plugin-react ^6.1.2, React ^19.3.1, and stable Babel compiler 1.0.0. Vite and Vitest both enable `reactCompilerPreset()`; compiled tests, lint, and production build passed after integration.

## Vite configuration

The inline `react({ babel: ... })` option was removed in plugin-react 6.0. Use this configuration, retaining the existing Nitro, Tailwind, CSP, portless, and alias settings. The preset includes a filter to reduce unnecessary compilation. [Vite changelog](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md#600-beta0-2026-03-03)

```sh
pnpm add -D babel-plugin-react-compiler @rolldown/plugin-babel @babel/core
```

```ts
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// Existing defineConfig:
plugins: [
  nitro(),
  react(),
  babel({ presets: [reactCompilerPreset()] }),
  tailwindcss(),
  injectCSP(),
  portless(),
],
```

These three peer dependencies are documented by Vite. With Babel 7 and TypeScript, also install `@types/babel__core`. [Vite plugin README](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#babel-react-compiler)

The compiler must run first inside a Babel transformation pipeline. React 19 is the default target; this app does not need the React 17/18 compatibility runtime. [React installation](https://react.dev/learn/react-compiler/installation), [target reference](https://react.dev/reference/react-compiler/target)

### Alternative: experimental native integration

Plugin-react 6.1 added `react({ compiler: true })` with the optional `oxc-transform-react` dependency. This avoids the Babel integration, but Vite still explicitly labels it experimental. Do not enable both compiler implementations. Treat native integration as a separate evaluation if build performance justifies it. [Vite README](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler), [6.1 changelog](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md#610-2026-08-19)

## Readiness and rollout

Oxlint is already useful here: `.oxlintrc.json` enables React for src and correctness errors globally. Oxc moved recommended compiler diagnostics into correctness rules; the old nursery `react/react-compiler` rule was replaced. `react/unsupported-syntax` remains in restriction; config/gating diagnostics are not implemented by Oxlint. Therefore this setup covers many compiler checks, but is not an exact replacement for React’s ESLint diagnostics. [Oxc announcement and rule table](https://oxc.rs/blog/2026-08-18-react-compiler-support)

The initial pre-upgrade readiness check reported purity diagnostics for Date usage at `src/hooks/useWeekNavigation.ts:73` and `src/components/ForecastCards.tsx:115`, plus synchronous effect state updates at `src/components/WindRangeField.tsx:16` and `src/components/ConfigForm.tsx:77,80,83`. Recheck paths/lines when implementing. Do not mechanically rewrite behavior merely to silence diagnostics.

React’s official lint route is `eslint-plugin-react-hooks`; it exposes compiler diagnostics before enabling compilation. Diagnostics generally cause affected components/hooks to be skipped while compatible code continues compiling. Fix violations incrementally. [React lint reference](https://react.dev/reference/eslint-plugin-react-hooks)

For a cautious pilot, use `reactCompilerPreset({ compilationMode: "annotation" })` and add `"use memo"` inside selected component/hook bodies; later return to default inference. React recommends incremental adoption for existing applications. Use `"use no memo"` temporarily for a problematic component and investigate the underlying issue. [Incremental adoption](https://react.dev/learn/react-compiler/incremental-adoption)

Keep the three existing `useCallback` calls in `src/hooks/useWeekNavigation.ts` during migration. React recommends retaining existing memoization or carefully testing removals because removal can change compilation output. New code can rely on automatic memoization unless precise control is needed. [React introduction](https://react.dev/learn/react-compiler/introduction)

## Phase one: explicit opt-in compilation

Use `reactCompilerPreset({ compilationMode: "annotation" })` in both Vite and Vitest. Only selected components and custom hooks with `"use memo"` inside their bodies participate. Start with pure presentation components, confirm successful compilation, and expand coverage after compiled tests and browser checks pass. Keep clock-dependent navigation outside the pilot. Default inference belongs to a later phase, not phase one. [React incremental adoption](https://react.dev/learn/react-compiler/incremental-adoption)

Implemented in both Vite and Vitest. The annotated pilot is `CalendarRequestStatus`, `CalendarNavigationControls`, and `useCalendarMode`. A compiler logger audit confirmed exactly three CompileSuccess events and compiler-runtime output in each pilot file. Unannotated functions remain outside phase one.

## Oxlint-only lint plan

Use Oxlint as the sole lint runner throughout migration and afterward. No temporary ESLint CLI, TypeScript ESLint parser, separate ESLint configuration, or second CI lint pipeline is needed.

- [x] Keep the built-in `react` plugin and correctness rules as the primary compiler checks. Explicitly verify `react/rules-of-hooks`, `react/exhaustive-deps`, and `react/unsupported-syntax`; unsupported syntax is outside correctness and needs explicit activation. Keep existing Effect checks. [Oxc compiler rule coverage](https://oxc.rs/blog/2026-08-18-react-compiler-support)
- [x] Compare native coverage with the installed upstream React Hooks preset. The native compiler port does not implement `config`/`gating`. Use `eslint-plugin-react-hooks` through Oxlint's `jsPlugins` API for missing checks if full upstream coverage is desired; installing an ESLint-named plugin does not require running ESLint. Prefer native rules for overlapping checks. [Oxlint JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)
- [x] If adding the JS plugin, pin its version, alias its namespace if necessary, and enable the needed rules explicitly in Oxlint. Verify loading and real diagnostics against this repo and installed Oxlint/Effect tooling before making it required. JS plugin support is alpha; compatibility testing is an acceptance gate. Do not claim exact upstream parity based on native rules alone. [JS plugin compatibility](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)
- [x] Keep all lint checks in the existing `pnpm lint`, `lint:ci`, and pre-commit Oxlint paths. Resolve findings or record narrow exceptions; avoid duplicate reports from native and JavaScript versions of the same rule.
- [x] Verify compiled tests, typecheck, production build, and browser behavior for each annotated expansion. Track `useWeekNavigation`'s intentional opt-out and `ForecastCalendar`'s compiler skip separately from lint success.

The full upstream recommended rule audit covers `exhaustive-deps`, `rules-of-hooks`, `component-hook-factories` (where present in the selected upstream version), `config`, `error-boundaries`, `gating`, `globals`, `immutability`, `incompatible-library`, `preserve-manual-memoization`, `purity`, `refs`, `set-state-in-effect`, `set-state-in-render`, `static-components`, `unsupported-syntax`, `use-memo`, and additions in the installed recommended-latest preset. Check current upstream deprecations rather than assuming every historical rule still exists. [React rule reference](https://react.dev/reference/eslint-plugin-react-hooks)

Implemented lint configuration: native `react/rules-of-hooks`, `react/exhaustive-deps`, and `react/unsupported-syntax` are explicit errors for src. Existing React/correctness rules remain active. Pinned `eslint-plugin-react-hooks@7.1.1` is loaded by Oxlint under `react-hooks-js`, with only `config` and `gating` enabled to fill native gaps. No ESLint runner, parser, or configuration was added. The installed upstream recommended-latest preset has 17 rules; component-hook-factories is no longer in it. A disposable conditional-Hook fixture confirmed real diagnostics through the JS plugin; the fixture was removed.

Validation: frozen dependency install and Effect prepare patches succeeded; 60 test files / 629 tests passed with annotation compilation enabled; typecheck/production build and both general/Effect lint passed. Browser smoke checks exercised Next and Today through a separate portless dev server. Build retains the existing >500 kB chunk warning; no performance gain is claimed. Worktree has no Vercel OIDC credentials, so authenticated feature evaluation was not validated.

The worktree carries the saved dependency updates from the main checkout as a baseline; those broader updates are not caused by annotation mode. Main checkout files were left untouched.

## Verification before rollout

Run `pnpm check` and `pnpm build`. Existing readiness failures need explicit resolution or documented baseline handling. A successful build alone does not prove compiler coverage: confirm a React DevTools “Memo ✨” badge or generated memoization/cache runtime in transformed output. [React verification guide](https://react.dev/learn/react-compiler/installation#verify-your-setup)

Then exercise week navigation, URL-driven state, forecast rendering, and configuration inputs in the browser; compare representative update performance and build duration before/after. This is a project-specific verification recommendation, not evidence of an already measured speedup. Compiler optimizations primarily target component updates and render-time calculations, not backend fetching or all arbitrary functions. [React introduction](https://react.dev/learn/react-compiler/introduction)

Unresolved questions: none.
