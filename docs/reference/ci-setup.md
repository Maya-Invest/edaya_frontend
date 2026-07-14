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
| [`deploy_push.yml`](../../.github/workflows/deploy_push.yml) | `deploy-*` | Verify, then `wrangler deploy` via [Cloudflare deploy](ci-setup.md#deploy-to-cloudflare-github-actions) |

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

Verify and deploy install `@maya-invest/edaya-api-client` from GitHub Packages (see [cross-repo-workflow.md](./cross-repo-workflow.md#ci)). Grant `edaya_web` **Read** on the [api-client package](https://github.com/orgs/Maya-Invest/packages/npm/edaya-api-client/settings) under **Manage Actions access**, or publish the package as **Public**.

Workflows append `GITHUB_TOKEN` to `.npmrc`, then run [`.github/scripts/ci-use-published-api-client.mjs`](../../.github/scripts/ci-use-published-api-client.mjs) to patch root `overrides` and app `dependencies` before `bun install`. Local dev keeps the `file:` link via the committed `package.json` files.

## Deploy to Cloudflare (GitHub Actions)

Deploy runs from GitHub Actions — not Cloudflare Workers Builds. See [`deploy_push.yml`](../../.github/workflows/deploy_push.yml) (push to `staging` / `main`).

| Step | What happens |
|------|----------------|
| `verify` | `bun run verify` (same as PR CI) |
| `deploy-webapp` | Published API client → build → `wrangler deploy` |
| `deploy-saas-admin` | Same for saas-admin |

**One-time repo secret:** `CLOUDFLARE_API_TOKEN` with Workers Scripts edit (+ routes if using custom domains). Wrangler reads it from the environment.

Branch mapping:

| Branch | API client channel | Wrangler env |
|--------|-------------------|--------------|
| `staging` | `staging` | `--env staging` |
| `main` | `production` | `--env prod` |

Manual deploy: **Actions → Push / Merge deploy → Run workflow**.

Root `cloudflare:*` scripts remain available for ad-hoc builds; GHA deploy uses the same `ci-use-published-api-client` path as verify (no `GITHUB_PACKAGES_TOKEN` or `.npmrc.cloudflare` needed).

## Cloudflare Workers Builds (optional)

If you prefer Cloudflare-native CI instead of GitHub Actions deploy, Cloudflare does not check out `edaya_backend`. Use the published API client and a custom install step.

### One-time dashboard setup (per Worker)

In **Workers & Pages → your Worker → Settings → Build**:

| Type | Name | Value |
|------|------|-------|
| Variable | `SKIP_DEPENDENCY_INSTALL` | `true` |
| Variable | `BUN_VERSION` | `1.3.14` (match root `packageManager`) |
| Variable | `NPM_CONFIG_USERCONFIG` | `/opt/buildhome/repo/.npmrc.cloudflare` |
| Secret | `GITHUB_PACKAGES_TOKEN` | Fine-grained PAT with `read:packages` on `Maya-Invest/edaya-api-client` |
| Variable | `API_CLIENT_CHANNEL` | Optional — `staging` or `production`. Defaults from branch (`main` → production, else staging). |

Set **Root directory** to the repository root (not `apps/webapp`) so Bun workspaces resolve.

### Build / deploy commands

**Webapp (staging example):**

| Step | Command |
|------|---------|
| Build | `bun run cloudflare:build:webapp` |
| Deploy | `bun --filter @edaya/webapp exec wrangler deploy --env staging` |

Add build variables for Vite public env (same as `deploy:staging` in `apps/webapp/package.json`), e.g. `PUBLIC_API_URL=https://staging.api.edayaplus.com`, `PUBLIC_APP_ENV=staging`.

**Saas-admin:** use `bun run cloudflare:build:saas-admin` and `bun --filter @edaya/saas-admin exec wrangler deploy --env staging`.

**Website (Astro, no API client):**

| Step | Command |
|------|---------|
| Build | `bun run cloudflare:build:website` |
| Deploy | `bun --filter @edaya/website exec wrangler deploy --env staging` |

No `GITHUB_PACKAGES_TOKEN` or `cloudflare-build-prepare` needed for the website — it has no private npm dependencies.

`cloudflare:build:webapp` and `cloudflare:build:saas-admin` run `scripts/cloudflare-build-prepare.mjs` (patches root `overrides` and app `dependencies` to GitHub Packages) then `bun install`. Auth is read from `.npmrc.cloudflare` via `GITHUB_PACKAGES_TOKEN`.

Local dev is unchanged: keep root `.npmrc` (scope only) and the root `overrides` `file:` link for sibling `edaya_backend`.

## PR pipeline

```text
gate → verify (bun run verify)
     → integration (Playwright + api-dev image, after verify)
```

Configured in [`pr.yml`](../../.github/workflows/pr.yml).

## Merge pipeline (staging / main)

```text
gate → verify (bun run verify)
     → deploy-webapp + deploy-saas-admin (wrangler deploy, parallel)
```

Configured in [`deploy_push.yml`](../../.github/workflows/deploy_push.yml). Requires repo secret `CLOUDFLARE_API_TOKEN`.

## Backend reference

The composite action is aligned with [edaya_backend/docs/reference/ci-setup.md](../../edaya_backend/docs/reference/ci-setup.md). Cache prefix differs per repo.
