# Cross-repo workflow

> **Audience:** humans — CI, OpenAPI, and multi-repo development  
> **Not normative for agents**

Edaya is split across three repositories:

| Repo | Role |
|------|------|
| `edaya_backend` | API, cron, domain packages, seeding |
| `edaya_web` | SvelteKit webapp + saas-admin, `@maya-invest/edaya-api-client` (web copy) |
| `edaya-client-codegen` | Publishes `@maya-invest/edaya-api-client`; `@edaya/client-codegen` remains for OpenAPI tooling only |

## CI without sibling checkouts

`edaya_web` CI runs `bun run verify` (`bun repo verify` first, then Turbo), which uses **committed** `apps/webapp/src/lib/api/openapi.json` for `bun repo check openapi`. It does **not** import `edaya_backend/apps/api` or require a sibling `edaya_backend` checkout.

`edaya_backend` CI runs the same verify shape and exports OpenAPI from the in-repo API.

Consumers install the generated client directly:

```json
"@maya-invest/edaya-api-client": "file:../../edaya-client-codegen/clients/school-api"
```

Symlink or CI-checkout `edaya-client-codegen` at the repo root (`edaya_web/edaya-client-codegen`). After npm publish:

```sh
npm install @maya-invest/edaya-api-client@staging
```

`@edaya/client-codegen` stays a devDependency on `tooling/repo` only (OpenAPI export/drift).

## When API routes change

Use a **pair PR** (or two linked PRs merged in order):

1. **`edaya_backend`** — change routes/extensions, then:
   ```sh
   cd edaya_backend
   bun repo openapi export       # updates tooling/repo/fixtures/openapi.json
   bun repo openapi generate     # updates package/generated-api-client/src/generated/*
   bun run verify
   ```
2. **`edaya_web`** — copy or export the updated spec, then:
   ```sh
   cd edaya_web
   bun repo openapi generate     # requires sibling edaya_backend for export; or copy openapi.json manually
   bun run verify
   ```

If both repos are checked out side by side, validate the OpenAPI snapshot matches the live export:

```sh
cd edaya_web
bun repo check openapi-export
```

## OpenAPI-only regeneration (no `edaya_backend` checkout)

When the committed `openapi.json` is already up to date:

```sh
cd edaya_web
edaya-codegen generate \
  --input apps/webapp/src/lib/api/openapi.json \
  --bindings-out apps/webapp/src/generated/api-client/generated/client-bindings.ts \
  --schema-out apps/webapp/src/lib/api/schema.d.ts \
  --client-out apps/webapp/src/generated/api-client/generated/create-client.ts
```

Or from a remote URL:

```sh
edaya-codegen generate \
  --input https://api-staging.edaya.softilab.dev/doc \
  --bindings-out apps/webapp/src/generated/api-client/generated/client-bindings.ts \
  --schema-out apps/webapp/src/lib/api/schema.d.ts \
  --client-out apps/webapp/src/generated/api-client/generated/create-client.ts
```

Then sync SaaS admin copies (or run `bun repo openapi generate` which copies automatically).

## Shared API client

Runtime and generated bindings live in `edaya-client-codegen/clients/school-api/` (`@maya-invest/edaya-api-client`). Webapp and backend tooling import the package — no per-repo `src/generated/api-client/` copies.

## Dev fixtures sync

`edaya_web/packages/web-fixtures` mirrors seed IDs and demo login data from `edaya_backend/tooling/fixtures`. Update both when seed data changes.

## Staging deploy and smoke

```sh
# API (from edaya_backend)
cd edaya_backend && bun repo deploy api staging && bun repo smoke-test staging

# Web apps (from edaya_web)
cd edaya_web && bun run deploy:webapp:staging && bun run deploy:saas-admin:staging
cd edaya_web && bun repo smoke-test staging
```

`bun repo smoke-test staging` in `edaya_web` checks that staging SPA shells respond. Full login, navigation, and R2 upload still require manual verification after deploy.

Override origins when needed:

```sh
STAGING_WEBAPP_ORIGIN=https://app-staging.edaya.softilab.dev \
STAGING_SAAS_ADMIN_ORIGIN=https://admin-staging.edaya.softilab.dev \
bun repo smoke-test staging
```

## Local development

```sh
# Terminal 1
cd edaya_backend && bun dev

# Terminal 2
cd edaya_web && bun run dev:webapp
```

Set `EDAYA_CORE_ROOT` when `edaya_backend` is not at `../edaya_backend` relative to `edaya_web`.
