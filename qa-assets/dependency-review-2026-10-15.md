# Dependency review — 2026-10-15

Scope: existing uncommitted `package.json` / `pnpm-lock.yaml` updates, separate from PR #39 and the week-rollover fix. Dependency files were not modified by this review.

## Compatibility

- Direct upgrades stay within their existing major versions.
- React / React DOM and Vitest / coverage versions remain aligned.
- Installed direct versions match the updated manifest constraints (`pnpm list --depth 0`).
- All 364 tests, lint, typecheck, and production build pass with the upgraded dependencies.
- Build still warns about a client chunk larger than 500 kB; this warning also occurred before the navigation fix.
- These checks are not exhaustive compatibility proof: browser smoke tests, live provider calls, and upstream release-note review were not performed.

## Security findings

`pnpm audit --json` reports 47 advisories: 3 critical, 20 high, 18 moderate, 6 low. Advisory counts are not counts of independently exploitable application bugs.

| Dependency path                                    | Finding                                                                       | Assessment / follow-up                                                                                                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oxfmt → tinypool@2.1.0`                           | Two critical prototype-pollution/RCE advisories                               | Development tooling; version already present in committed lockfile. Seek a compatible upgrade to at least 2.1.2. Exploitability not established.                                   |
| `vercel → @vercel/fun → tar@7.5.7`                 | Critical resource-exhaustion advisory and additional high/moderate advisories | Development/deployment tooling; version already present in committed lockfile. Seek a patched compatible dependency chain (audit recommends at least 7.5.21 for the reported set). |
| `nitro → unstorage → @vercel/blob → undici@6.28.0` | High and moderate WebSocket DoS; low response splitting                       | Production dependency graph, but application reachability is unverified. Version already present in committed lockfile. Seek a compatible upgrade to at least 6.28.1.              |
| Vite dependency chains → `esbuild@0.27.7`          | Low Windows development-server file-read advisory                             | Upgraded from 0.27.0 into the reported vulnerable range (>=0.27.3, <0.28.1). Relevant to Windows development-server use, not evidence of a production exploit.                     |

Other advisories primarily affect transitive Vercel CLI dependencies; inspect full `pnpm audit` output before accepting the dependency update.

`pnpm audit --prod --json` reports 4 advisories: 1 high, 1 moderate, 2 low, covering the Undici and esbuild paths above. Dependencies classified as production can still be build-only; classification alone does not prove deployed exposure.

## Recommendation

Keep dependency upgrades separate from the navigation fix. Compatibility checks are green, but do not call this dependency set security-clean. Triage the critical tooling advisories and production-graph Undici finding before approving the upgrade separately. Do not apply blanket major-version overrides without compatibility testing.
