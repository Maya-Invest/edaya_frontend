# Cross-repo workflow

> **Audience:** humans — CI, OpenAPI, and multi-repo development  
> **Not normative for agents**

Edaya is split across repositories:

| Repo | Role |
|------|------|
| `edaya_backend` | API, cron, domain packages, `@maya-invest/edaya-api-client`, client codegen |
| `edaya_web` | SvelteKit webapp + saas-admin |

The standalone `edaya-client-codegen` repo is **deprecated** — generation lives in `edaya_backend/tooling/client-codegen`, output in `edaya_backend/package/api-client`.

## CI

`edaya_web` CI checks out **edaya_backend** as a sibling (`edaya_backend/`) for the shared api-client and codegen tooling, then runs `bun run verify`.

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

## When API routes change

Use a **pair PR** (or two linked PRs merged in order):

1. **`edaya_backend`** — change routes/extensions, then:
   ```sh
   cd edaya_backend
   bun repo openapi export
   bun repo openapi generate     # updates package/api-client/src/
   bun run verify
   ```
2. **`edaya_web`** — copy or export the updated spec, then:
   ```sh
   cd edaya_web
   bun repo openapi generate     # updates schema + saas-admin copies
   bun run verify
   ```

If both repos are checked out side by side, validate the OpenAPI snapshot matches the live export:

```sh
cd edaya_web
bun repo check openapi-export
```

## OpenAPI-only regeneration (no live API)

When the committed `openapi.json` is already up to date:

```sh
cd edaya_web
bun repo openapi generate
```

Or export schema only from the committed spec (drift check uses `edaya_backend/package/api-client/src/schema.d.ts` as reference when backend is checked out).

## Shared API client

Runtime and generated bindings live in `edaya_backend/package/api-client/` (`@maya-invest/edaya-api-client`). Webapp imports the package — no per-repo `src/generated/api-client/` copies.

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
