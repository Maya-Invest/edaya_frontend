# CI setup

> **Audience:** humans — GitHub Actions workflows and reusable setup  
> **Not normative for agents**

`edaya_web` CI follows the same pattern as [`edaya_backend`](../../edaya_backend): a composite action for Bun install, dependency caching, and Turbo remote cache.

## Composite action: `ci-bun-turbo`

Path: [`.github/actions/ci-bun-turbo`](../../.github/actions/ci-bun-turbo/action.yml)

| Step | What it does |
|------|----------------|
| Setup Bun | `oven-sh/setup-bun@v2` — version from root `packageManager` (`bun@1.3.14`) |
| Cache Bun deps | `actions/cache@v6` on `~/.bun/install/cache`, keyed by `bun.lock` |
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

Integration uses inline setup because it starts api-dev containers, installs Playwright, builds the webapp, and serves it with Wrangler — not just the Turbo graph.

Caching in `_integration.yml`:
- **Bun deps + Turbo** — `./.github/actions/ci-bun-turbo` (same as verify)
- **Playwright** — `~/.cache/ms-playwright` keyed on `apps/webapp/package.json` + `bun.lock`
- **api-dev Docker image** — `docker save`/`load` tar in Actions cache, keyed on GHCR digest (invalidates when `:staging` / `:production` moves)

After `vite build`, CI runs `bun run preview:integration` (`wrangler dev --local`) instead of `vite preview`. Static adapter prerender creates files for list routes only; dynamic deep links (e.g. `/school/students/ci-s1`) need Wrangler’s `not_found_handling: single-page-application` — same as production deploy.

## Verify entry point

```sh
bun run verify
# bun repo verify && turbo run quality && turbo run build && turbo run test -- --dots
```

Repo hygiene runs **first** (doctor, OpenAPI drift, repo unit tests). See [repo-cli.md](./repo-cli.md).

Playwright integration (`apps/webapp` `test:integration`) is a **separate** PR job after verify — not part of `bun run verify`.

## GHCR access for api-dev image

Integration pulls `ghcr.io/maya-invest/edaya-api-dev:staging|production` from `edaya_backend`.

Consumer CI uses this repo's `GITHUB_TOKEN` (`packages: read`). Cross-repo pulls require **one-time** package access in GitHub (not a PAT):

1. Open [edaya-api-dev package settings](https://github.com/orgs/Maya-Invest/packages/container/edaya-api-dev/settings)
2. **Manage Actions access** → **Add repository** → `edaya_web` → **Read**
3. Repeat for `edaya_mobile`

**Alternative:** set package visibility to **Public** (anonymous `docker pull`; fine for the dev API image).

## GitHub Packages access for API client

Verify installs `@maya-invest/edaya-api-client` from GitHub Packages (see [cross-repo-workflow.md](./cross-repo-workflow.md#ci)). Grant `edaya_web` **Read** on the [api-client package](https://github.com/orgs/Maya-Invest/packages/npm/edaya-api-client/settings) under **Manage Actions access**, or publish the package as **Public**.

## PR pipeline

```text
gate → verify (bun run verify)
     → integration (Playwright + api-dev image, after verify)
```

Configured in [`pr.yml`](../../.github/workflows/pr.yml).

## Backend reference

The composite action is aligned with [edaya_backend/docs/reference/ci-setup.md](../../edaya_backend/docs/reference/ci-setup.md). Cache prefix differs per repo.
