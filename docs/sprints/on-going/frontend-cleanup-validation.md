# Frontend cleanup validation

> **Lifecycle:** on-going — implementation and local qualification complete; GitHub qualification pending

## Delivered

- [x] Verified unreachable source removal, compatibility picker removal and shared registry cleanup.
- [x] Feature UI/state colocation without forwarding modules.
- [x] Route/tab and smart workflow I/O ownership, typed shared action props and entity-family invalidation.
- [x] Messaging identity/query ownership, polling and reply conflict behavior retained.
- [x] Removed absent website/workspace commands and unused Cloudflare build helpers that referenced a removed registry-tag workflow; vendored client and fixture documentation aligned.
- [x] Added retired-import, presentation I/O and workspace-reference checks to repository verification.

## Qualification

- [x] Focused mutation tests: success, rollback, conflicts and saved-but-refresh-failed.
- [x] Focused tab invalidation, invitation actor changes and messaging state tests.
- [x] Full `bun run verify` on final implementation: lint, type checks, builds, unit tests, architecture, brand and release-contract checks passed, including the final authentication ownership audit.
- [x] Existing local browser suites: availability, onboarding, provisioned, webadmin, development demo and messaging UI; required integration coverage validated.
- [x] Desktop/mobile checks in French and English for affected screens: 36 captures across nine screens at 1440px and 390px.
- [ ] GitHub verification and integration must pass for the final revision before merge.

Local evidence is separate from GitHub results. Webadmin placeholder routes and future product features remain outside cleanup scope.

The final local browser run on 2026-10-05 passed 403 provisioned behavior checks, four webadmin scenarios and 119 demo checks with no failures or skips. Messaging UI checks passed for the responsive drawer, stale-reply review, preserved drafts, resolution, read-only oversight and Escape. All required suite results passed the source-freshness coverage check. Representative captures were visually reviewed; existing product layouts were preserved.

Browser qualification also identified and corrected premature permission validation on Tools reloads and encoded session-ID handling for logbook modal actions. The QA harness now uses mobile shell readiness and the subject label actually rendered by lesson cells.

The final authentication audit colocated passwordless and test-OTP workflow state, moved logout actions into account/invitation state, and removed Vite’s automatic sibling/symlink client override so local builds use the committed vendored client too. Build configuration now participates in browser result freshness.
