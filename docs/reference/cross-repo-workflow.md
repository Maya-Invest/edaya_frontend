# Cross-repo workflow

Edaya is split across three repositories:

| Repo | Role |
|------|------|
| `edaya_backend` | API, cron, domain packages, seeding |
| `edaya_web` | SvelteKit webapp + saas-admin, `@edaya/api-client` (web copy) |
| `edaya-client-codegen` | OpenAPI-only client artifact generator (`@edaya/client-codegen`), consumed via GitHub git dependency |

## CI without sibling checkouts

`edaya_web` CI runs `bun run verify`, which uses **committed** `apps/webapp/src/lib/api/openapi.json` for `generated:check`. It does **not** import `edaya_backend/apps/api` or require a sibling `edaya_backend` checkout.

`edaya_backend` CI runs the same `verify` command and exports OpenAPI from the in-repo API.

Both repos install `@edaya/client-codegen` from GitHub at `bun install`:

```json
"@edaya/client-codegen": "github:Maya-Invest/edaya-client-codegen#dev"
```

Pin a semver tag (e.g. `#v0.0.1`) instead of `#dev` when you want reproducible releases.

## When API routes change

Use a **pair PR** (or two linked PRs merged in order):

1. **`edaya_backend`** — change routes/extensions, then:
   ```sh
   cd edaya_backend
   bun run export-openapi          # updates tooling/repo/fixtures/openapi.json
   bun run generated:update        # updates package/generated-api-client/src/generated/*
   bun run verify
   ```
2. **`edaya_web`** — copy or export the updated spec, then:
   ```sh
   cd edaya_web
   bun run openapi:generate        # requires sibling edaya_backend for export; or copy openapi.json manually
   bun run verify
   ```

If both repos are checked out side by side, validate the OpenAPI snapshot matches the live export:

```sh
cd edaya_web
bun run generated:check:export
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

Then sync SaaS admin copies (or run `bun run openapi:generate` which copies automatically).

## Hand-written runtime sync

Generated artifacts are regen-only. These files are duplicated and must stay aligned manually until Phase 3 (shared `@edaya/api-client`) ships:

- `edaya_backend/package/generated-api-client/src/` (runtime: `Transport`, `EntityResource`, `paths.ts`, …)
- `edaya_web/apps/webapp/src/generated/api-client/` (runtime: `Transport`, `EntityResource`, `paths.ts`, …)

## Dev fixtures sync

`edaya_web/packages/web-fixtures` mirrors seed IDs and demo login data from `edaya_backend/tooling/fixtures`. Update both when seed data changes.

## Staging deploy and smoke

```sh
# API (from edaya_backend)
cd edaya_backend && bun run deploy:api:staging && bun run smoke:staging

# Web apps (from edaya_web)
cd edaya_web && bun run deploy:webapp:staging && bun run deploy:saas-admin:staging
cd edaya_web && bun run smoke:staging
```

`smoke:staging` in `edaya_web` checks that staging SPA shells respond. Full login, navigation, and R2 upload still require manual verification after deploy.

Override origins when needed:

```sh
STAGING_WEBAPP_ORIGIN=https://app-staging.edaya.softilab.dev \
STAGING_SAAS_ADMIN_ORIGIN=https://admin-staging.edaya.softilab.dev \
bun run smoke:staging
```

## Local development

```sh
# Terminal 1
cd edaya_backend && bun dev

# Terminal 2
cd edaya_web && bun run dev:webapp
```

Set `EDAYA_CORE_ROOT` when `edaya_backend` is not at `../edaya_backend` relative to `edaya_web`.
