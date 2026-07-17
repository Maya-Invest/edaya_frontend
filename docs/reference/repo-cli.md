# Repo CLI (`bun repo`)

Canonical entry point for **repo hygiene and operations** in the `edaya_web` monorepo. **Turbo quality tasks** (`lint`, `check`, `test`, `build`, `quality`) run from the **repo root only** — never through `bun repo`.

```sh
bun repo --help
```

Implementation: `tooling/repo/cli/` — thin subprocess dispatch, no app imports.

## Quick start

| Task | Command |
|------|---------|
| Pre-PR check | `bun run verify` |
| Repo hygiene only | `bun repo verify` |
| Staging smoke | `bun repo smoke-test staging` |

## Command tree

```text
bun repo
├── doctor
├── verify
└── smoke-test staging
```

Deploy commands (`deploy:webapp:*`, `deploy:webadmin:*`) remain on the root `package.json` for now.

## Validation

### `bun repo doctor`

Repo hygiene: tracked env files, required `.env.example` files. Materializes `.env` from examples when missing (for CI and first-time setup).

### `bun repo verify`

Repo hygiene only — **no Turbo**. Runs:

1. `repo doctor`
2. `@edaya/web-repo` unit tests

**Not included:** `lint`, `check`, `build`, `test`, `quality` (root Turbo scripts), Playwright integration.

### Pre-PR (`bun run verify`)

Full gate from repo root — repo hygiene first, then Turbo quality + build + unit tests:

```sh
bun run verify
# = bun repo verify && bun run quality && bun run build && turbo run test -- --dots
```

CI uses `bun run verify`. Playwright integration runs in a separate PR job — see [ci-setup.md](./ci-setup.md).

## API client

OpenAPI export and client generation live in **edaya_backend** (`bun repo openapi export` / `generate`). Web consumes `@maya-invest/edaya-api-client` — see [cross-repo-workflow.md](./cross-repo-workflow.md).

## Operations

```sh
bun repo smoke-test staging
```

## Per-package iteration

```sh
bun --filter @edaya/webapp test
bun --filter @edaya/webapp lint
```

Then `bun run verify` before opening a PR.
