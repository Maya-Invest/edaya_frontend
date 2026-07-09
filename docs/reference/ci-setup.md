# CI setup

> **Audience:** humans — GitHub Actions workflows and reusable setup  
> **Not normative for agents**

`edaya_web` CI follows the same pattern as [`edaya_backend`](../../edaya_backend): a composite action for Bun install, dependency caching, and Turbo remote cache.

## Composite action: `ci-bun-turbo`

Path: [`.github/actions/ci-bun-turbo`](../../.github/actions/ci-bun-turbo/action.yml)

| Step | What it does |
|------|----------------|
| Setup Bun | `oven-sh/setup-bun@v2` — version from root `packageManager` (`bun@1.3.14`) |
| Cache Bun deps | `actions/cache@v4` on `~/.bun/install/cache`, keyed by `bun.lock` |
| Install | `bun install` |
| Turbo cache | `rharkor/caching-for-turbo@v2.5.0` — restores/saves `.turbo` via GitHub Actions cache |

### Inputs

| Input | Default | Purpose |
|-------|---------|---------|
| `bun-version` | `1.3.14` | Bun runtime (match `packageManager` in root `package.json`) |
| `cache-prefix` | `edaya-web-turbo-` | Isolate Turbo cache keys from `edaya_backend` |

### Usage

```yaml
- name: Setup Bun and Turbo cache
  uses: ./.github/actions/ci-bun-turbo
```

## Workflows

| Workflow | Job | Command |
|----------|-----|---------|
| [`_verify.yml`](../../.github/workflows/_verify.yml) | `verify` | `bun run verify` |
| [`_integration.yml`](../../.github/workflows/_integration.yml) | `integration` | Playwright (inline `setup-bun`; Docker/GHCR) |

Integration uses inline setup because it starts api-dev containers, installs Playwright, and builds a preview server — not just the Turbo graph.

## Verify entry point

```sh
bun run verify
# bun repo verify && turbo run quality && turbo run build && turbo run test -- --dots
```

Repo hygiene runs **first** (doctor, OpenAPI drift, repo unit tests). See [repo-cli.md](./repo-cli.md).

Playwright integration (`apps/webapp` `test:integration`) is a **separate** PR job after verify — not part of `bun run verify`.

## GHCR access for api-dev image

Integration pulls `ghcr.io/<org>/edaya-api-dev:staging|production` published from `edaya_backend`.

Configure GHCR auth for consumer CI:

| Setting | Where | Value |
|---------|-------|-------|
| `GHCR_READ_TOKEN` | Actions **secret** (org or repo) | Classic PAT with `read:packages`, or fine-grained token with read on `edaya-api-dev` |
| `GHCR_READ_USERNAME` | Actions **variable** (org or repo) | GitHub **user** account that owns the PAT — not `Maya-Invest` |

Login uses `vars.GHCR_READ_USERNAME || github.actor`. If the variable is unset, the workflow actor must be the PAT owner.

**Alternative (no PAT):** package settings → **Manage Actions access** → grant **Read** to `edaya_web` / `edaya_mobile`, then switch docker login back to `GITHUB_TOKEN`.

## PR pipeline

```text
gate → verify (bun run verify)
     → integration (Playwright + api-dev image, after verify)
```

Configured in [`pr.yml`](../../.github/workflows/pr.yml).

## Backend reference

The composite action is aligned with [edaya_backend/docs/reference/ci-setup.md](../../edaya_backend/docs/reference/ci-setup.md). Cache prefix differs per repo.
