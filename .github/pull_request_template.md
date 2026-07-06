## Summary

<!-- What changed and why (1–3 bullets). -->

## Scope check

- [ ] **Webapp features complete** — Teachers, Students, Guardians, and related staff screens are in scope; do not defer or stub portal-actor management UI.
- [ ] Touches `*View.svelte` with script **> 60 lines** → state extracted to `*-state.svelte.ts` or justified in PR description (see [svelte-state-spec.md](specs/svelte-state-spec.md)).
- [ ] List filters use `ListFiltersState` + URL codecs (no ad-hoc `q` / `filtersReady` / `scheduleFilterSync`).
- [ ] **Backend permission changes** (this repo or `edaya_backend`) — verify portal authorization still works for seeded teachers/guardians/students in mobile apps, not only staff webapp routes.

## Test plan

- [ ] `cd apps/webapp && bun run check`
- [ ] `cd apps/webapp && bun test tests`
- [ ] Manual: relevant route(s) — list filters round-trip in URL, drawer opens, mutation toast
- [ ] If permissions/seeds touched: spot-check portal actor in `edaya_mobile` (see [demo-accounts.md](docs/reference/demo-accounts.md))
