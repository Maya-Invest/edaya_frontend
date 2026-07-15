# Cross-repo workflow

> **Audience:** humans — CI, OpenAPI, and multi-repo development  
> **Not normative for agents**

Edaya is split across repositories:

| Repo | Role |
|------|------|
| `edaya_backend` | API, cron, domain packages, `@maya-invest/edaya-api-client`, client codegen |
| `edaya_web` | SvelteKit webapp + webadmin |

OpenAPI export and client generation live **only** in `edaya_backend`. Web consumes `@maya-invest/edaya-api-client` — no local OpenAPI copies or codegen.

## CI

`edaya_web` CI installs `@maya-invest/edaya-api-client` from **GitHub Packages** (`staging` / `production` dist-tags). It does not check out `edaya_backend` — the default `GITHUB_TOKEN` cannot read that private repo.

One-time org setup: grant `edaya_web` **Read** on the `@maya-invest/edaya-api-client` package (same as [edaya-api-dev in ci-setup.md](./ci-setup.md#ghcr-access-for-api-dev-image)).

`edaya_backend` CI exports OpenAPI and drift-checks `package/api-client/src/` in-repo.

## Local install

Clone both repos side by side, then symlink the backend into the web repo (CI uses the same layout):

```sh
ln -s ../edaya_backend edaya_web/edaya_backend
```

```
edaya_web/
  edaya_backend/   # symlink → ../edaya_backend
  apps/
  tooling/
```

After GitHub Packages publish:

```sh
bun add @maya-invest/edaya-api-client@staging
```

**Cloudflare deploy** runs from GitHub Actions ([`deploy_push.yml`](../../.github/workflows/deploy_push.yml)) — see [ci-setup.md](./ci-setup.md#deploy-to-cloudflare-github-actions). Cloudflare Workers Builds is optional for ad-hoc use via `bun run cloudflare:build:webapp`.

## When API routes change

1. **`edaya_backend`** — change routes/extensions, then:
   ```sh
   cd edaya_backend
   bun repo openapi export
   bun repo openapi generate     # updates package/api-client/src/
   bun run verify
   ```
2. **`edaya_web`** — refresh the linked client (or bump the published package version), then:
   ```sh
   cd edaya_web
   bun install                   # picks up file: link or new package version
   bun run verify
   ```

No OpenAPI JSON or schema generation in the web repo.

## Shared API client

Runtime and generated bindings live in `edaya_backend/package/api-client/` (`@maya-invest/edaya-api-client`).

Web apps import:

- Runtime: `createSchoolClient`, `ApiError`, … from `@maya-invest/edaya-api-client`
- Types: `components`, `operations`, `paths` via `$lib/api/schema` (re-export of `@maya-invest/edaya-api-client/schema`)

## Dev fixtures sync

`edaya_web/packages/web-fixtures` mirrors seed IDs and demo login data from `edaya_backend/tooling/fixtures`. Update both when seed data changes.

## Staging deploy and smoke

```sh
# API (from edaya_backend)
cd edaya_backend && bun repo deploy api staging && bun repo smoke-test staging

# Web apps (from edaya_web)
cd edaya_web && bun run deploy:webapp:staging && bun run deploy:webadmin:staging
cd edaya_web && bun repo smoke-test staging
```
