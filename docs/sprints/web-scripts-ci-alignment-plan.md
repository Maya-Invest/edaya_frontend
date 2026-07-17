# Web scripts & CI alignment plan

> **Status:** on-going  
> **Model:** [`edaya_backend`](../../edaya_backend) — `bun repo` CLI, two-tier verify, `ci-bun-turbo`  
> **Scope:** Align `edaya_web` root scripts and CI with the backend monorepo pattern

## Goal

Same mental model as backend:

```sh
bun run verify
# bun repo verify && turbo run quality && turbo run build && turbo run test -- --dots
```

- **Turbo** — quality graph (`lint`, `check`, `quality`, `test`, `build`) from root only
- **`bun repo`** — repo hygiene, smoke tests (no Turbo)
- **CI verify job** — `bun run verify` via `ci-bun-turbo`
- **Integration** — separate PR job (Playwright + api-dev image); not part of verify

## Gap (before)

| Area | Backend (model) | Web (was) |
|------|-----------------|-----------|
| Verify | `bun repo verify` first, then turbo | 8-step manual root chain |
| Ops | `bun repo <group>` | `--filter @edaya/web-repo` on 10+ root scripts |
| `test` | `turbo run test` | `test:repo` + turbo |
| CI setup | `ci-bun-turbo` | Inline `setup-bun` |

## `bun repo` command tree (web)

```text
bun repo
├── doctor                       # env hygiene + materialize .env from examples
├── verify                       # doctor + repo unit tests
└── smoke-test staging
```

Deploy (`deploy:webapp:*`, `deploy:webadmin:*`) stays at root for now.

## Target root scripts

```json
{
  "repo": "bun tooling/repo/cli/main.ts",
  "verify": "bun repo verify && turbo run quality && turbo run build && turbo run test -- --dots",
  "test": "turbo run test"
}
```

Optional thin aliases were removed; use `bun repo` directly.

## Phases

### Phase 1 — `bun repo` CLI

- [x] `tooling/repo/cli/` — thin dispatch (mirror backend)
- [x] `verify`, `smoke-test`, `doctor`
- [x] Extend `doctor` to copy `.env` from examples when missing

### Phase 2 — Root scripts

- [x] Root `package.json` — `repo`, verify contract, `test` = turbo only
- [x] Remove redundant root scripts (`prepare:env`, OpenAPI/smoke aliases)
- [x] `turbo.json` — `dependsOn: ["^check"]` on check/quality/test (match backend)

### Phase 3 — CI

- [x] Copy `.github/actions/ci-bun-turbo/` with `cache-prefix: edaya-web-turbo-`
- [x] `_verify.yml` — composite action + `checkout@v5`
- [ ] `_integration.yml` — keep inline setup (Docker/GHCR/Playwright)

### Phase 4 — Docs

- [x] `docs/reference/repo-cli.md`
- [x] `docs/reference/ci-setup.md`
- [x] `README.md`, `AGENTS.md`, `cross-repo-workflow.md`

### Out of scope

- Playwright integration workflow changes
- `merge.yml` api-dev consumer rerun
- `_coverage.yml` (backend has it; defer for web)
- `bun repo deploy` (root deploy scripts sufficient)

## Verification

```sh
bun repo verify
bun run verify
```

- [x] `bun run verify` idempotent twice locally
- [ ] CI verify job green on PR

## References

- [edaya_backend/docs/reference/repo-cli.md](../../edaya_backend/docs/reference/repo-cli.md)
- [edaya_backend/docs/reference/ci-setup.md](../../edaya_backend/docs/reference/ci-setup.md)
