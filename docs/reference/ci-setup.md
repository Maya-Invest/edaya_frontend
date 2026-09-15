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
| [`_integration.yml`](../../.github/workflows/_integration.yml) | `integration` | `test:integration:onboarding` then `test:integration:provisioned` (empty Identity + school from source, Wrangler, Playwright) |
| [`deploy_push.yml`](../../.github/workflows/deploy_push.yml) | `deploy-*` | `wrangler deploy` via [Cloudflare deploy](ci-setup.md#deploy-to-cloudflare-github-actions) |

Integration uses inline setup because it starts Identity and school from sibling checkouts, installs Playwright, builds the webapp, and serves it with Wrangler — not just the Turbo graph. Identity listens on `:9900`, school on `:9999` (files `:9200`). The webapp build sets `PUBLIC_AUTH_URL=http://127.0.0.1:9900`. Playwright then runs two suites against that stack: UI signup + onboarding wizard (`test:integration:onboarding`), then API-provisioned owner journey (`test:integration:provisioned` / `provisionTenant()`). CI does **not** run `bun repo seed`. The provisioned suite still runs if onboarding fails, as long as the Wrangler preview came up.

Caching in `_integration.yml`:
- **Bun deps + Turbo** — `./.github/actions/ci-bun-turbo` (same as verify)
- **Playwright** — `~/.cache/ms-playwright` keyed on `apps/webapp/package.json` + `bun.lock`

After `vite build`, CI runs `bun run preview:integration` (`wrangler dev --local`) instead of `vite preview`. Static adapter prerender creates files for list routes only; dynamic deep links (e.g. `/school/students/ci-s1`) need Wrangler’s `not_found_handling: single-page-application` — same as production deploy.

## Verify entry point

```sh
bun run verify
# bun repo verify && turbo run quality && turbo run build && turbo run test -- --dots
```

Repo hygiene runs **first** (doctor, OpenAPI drift, repo unit tests). See [repo-cli.md](./repo-cli.md).

Webapp **unit tests** (`bun test tests/lib`) must not depend on a sibling `edaya_backend` checkout or on live `$state` modules. Bun preload stubs toast/session in [`apps/webapp/tests/support/sveltekit-mocks.ts`](../../apps/webapp/tests/support/sveltekit-mocks.ts). Catalog fixtures live in [`apps/webapp/tests/fixtures/ivory-coast`](../../apps/webapp/tests/fixtures/ivory-coast). A local-green / CI-red loop usually means a new test opened one of those doors — `ci-parity-guard.test.ts` is meant to catch that before push.

Playwright integration (`apps/webapp` `test:integration:onboarding` then `test:integration:provisioned`) is a **separate** PR job after verify — not part of `bun run verify`. Client walkthrough is `demo:e2e`, not CI.

## Sibling Identity and school (Playwright)

Provisioned Playwright starts **empty** Identity and school from source. The onboarding suite signs up in the UI; the provisioned suite then creates a second tenant via `provisionTenant()`. `GITHUB_TOKEN` cannot read those private repos.

**One-time repo secret:** `IDENTITY_CHECKOUT_TOKEN` — a PAT with `contents:read` on both `Maya-Invest/edaya_identity` and `Maya-Invest/edaya_backend`. The same secret name is used in backend CI.

Checkout layout (same sibling pattern backend CI uses for the identity client):

```text
$GITHUB_WORKSPACE/              # this repo (edaya_web)
.ci/edaya_identity
.ci/edaya_backend
$(dirname $GITHUB_WORKSPACE)/edaya_identity  → .ci/edaya_identity
$(dirname $GITHUB_WORKSPACE)/edaya_backend   → .ci/edaya_backend
```

School’s `file:../edaya_identity/package/identity-client` override then resolves. The webapp **install still uses the published** `@maya-invest/edaya-api-client` (`ci-use-published-api-client.mjs`).

Git ref is taken from the **web head branch** (PR branch, or `github.ref_name` on dispatch):

| Web head | Identity + school ref |
|----------|------------------------|
| `staging` | `staging` |
| `main` / `master` | `main` |
| anything else | `dev` |

The job fails if that branch is missing on either sibling. Identity needs `dev`, `staging`, and `main` on `Maya-Invest/edaya_identity` (not only a feature branch).

Start script: [`.github/scripts/ci-start-local-apis.sh`](../../.github/scripts/ci-start-local-apis.sh) copies each checkout’s `.env.example`, sets a shared `IDENTITY_DIRECTORY_SECRET`, and adds Wrangler origins (`http://127.0.0.1:4173` and `http://localhost:4173`) to `TRUSTED_ORIGINS`. Identity gets `FIRST_PARTY_API_ORIGINS=http://localhost:9999`; school gets `API_ORIGIN=http://localhost:9999`. JWT issuer/audience stay `http://localhost:9900` / `http://localhost:9999`. Identity starts with `bun --filter @edaya/identity start`; school with `bun repo dev`.

## GitHub Packages access for API client

Verify and deploy install `@maya-invest/edaya-api-client` from GitHub Packages (see [cross-repo-workflow.md](./cross-repo-workflow.md#ci)). Grant `edaya_web` **Read** on the [api-client package](https://github.com/orgs/Maya-Invest/packages/npm/edaya-api-client/settings) under **Manage Actions access**, or publish the package as **Public**.

Workflows append `GITHUB_TOKEN` to `.npmrc`, then run [`.github/scripts/ci-use-published-api-client.mjs`](../../.github/scripts/ci-use-published-api-client.mjs) to patch root `overrides` and app `dependencies` before `bun install`. Local dev keeps the `file:` link via the committed `package.json` files.

## Deploy to Cloudflare (GitHub Actions)

Deploy runs from GitHub Actions — not Cloudflare Workers Builds. See [`deploy_push.yml`](../../.github/workflows/deploy_push.yml) (push to `staging` / `main`).

| Step | What happens |
|------|----------------|
| `deploy-webapp` | Published API client → build → `wrangler deploy` |
| `deploy-webadmin` | Same for webadmin |

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
| Deploy | `bun --filter @edaya/webapp deploy:staging` |

Add build variables for Vite public env (same as `deploy:staging` in `apps/webapp/package.json`), e.g. `PUBLIC_AUTH_URL=https://staging.identity.api.edayaplus.com`, `PUBLIC_API_URL=https://staging.school.api.edayaplus.com`, `PUBLIC_APP_ENV=staging`.

**Webadmin:** use `bun run cloudflare:build:webadmin` and `bun --filter @edaya/webadmin deploy:staging`.

**Website (Astro, no API client):**

| Step | Command |
|------|---------|
| Build | `bun run cloudflare:build:website` |
| Deploy | `bun --filter @edaya/website exec wrangler deploy --env staging` |

No `GITHUB_PACKAGES_TOKEN` or `cloudflare-build-prepare` needed for the website — it has no private npm dependencies.

`cloudflare:build:webapp` and `cloudflare:build:webadmin` run `scripts/cloudflare-build-prepare.mjs` (patches root `overrides` and app `dependencies` to GitHub Packages) then `bun install`. Auth is read from `.npmrc.cloudflare` via `GITHUB_PACKAGES_TOKEN`.

Local dev is unchanged: keep root `.npmrc` (scope only) and the root `overrides` `file:` link for sibling `edaya_backend`.

## PR pipeline

```text
gate → verify (bun run verify)
     → integration (test:integration:onboarding then test:integration:provisioned + empty Identity/school, after verify)
```

Configured in [`deploy_pr.yml`](../../.github/workflows/deploy_pr.yml).

## Merge pipeline (staging / main)

```text
gate (path filter) → deploy-webapp / deploy-webadmin when app paths changed
```

On push, `dorny/paths-filter` sets `deploy_webapp` / `deploy_webadmin` from changed paths. Manual **Run workflow** keeps explicit toggles. Deploy jobs patch `@maya-invest/edaya-api-client` to GitHub Packages before `bun install` (see `_deploy-cloudflare.yml`). Verify and provisioned integration run on PRs only (`deploy_pr.yml`), not on merge deploy.

Configured in [`deploy_push.yml`](../../.github/workflows/deploy_push.yml). Requires repo secret `CLOUDFLARE_API_TOKEN`.

## Backend reference

The composite action is aligned with [edaya_backend/docs/reference/ci-setup.md](../../edaya_backend/docs/reference/ci-setup.md). Cache prefix differs per repo.
