# Cross-repo workflow

> **Audience:** humans — CI, OpenAPI, and multi-repo development  
> **Not normative for agents**

Edaya is split across repositories:

| Repo | Role |
|------|------|
| `edaya_backend` | School API and Identity, domain packages, API and Identity clients, codegen |
| `edaya_web` | SvelteKit webapp + webadmin |
| `edaya_mobile` | Guardian and teacher Flutter apps |

OpenAPI export and client generation live **only** in `edaya_backend`. Web consumes `@maya-invest/edaya-api-client` — no local OpenAPI copies or codegen.

## CI

Unit checks install the committed vendored API client with a frozen lockfile. Full PR/release qualification resolves a backend candidate once, verifies release contracts and source fingerprints, and runs all five browser suites against its unified disposable API. Resolution prefers explicit `backend_ref`, then the matching consumer branch, then the PR target. Registry publication is needed only for a deployment's exact qualified client version. See [ci-setup.md](./ci-setup.md).

## Local install

Clone the repos side by side, then symlink the backend into the web repo for the local `file:` API client:

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

## Staging validation and rollout

Use backend `release-staging.yml` or its dispatch wrapper with the exact backend/web/mobile revisions. `validate_only=true` runs qualification, staging builds/dry runs and signed-APK verification without publishing clients, deploying Workers or changing staging data. After qualification, the rollout coordinator publishes/reuses both API and Identity clients from the backend commit, then verifies the web against the exact published API version.

Keep phone/SMS/WhatsApp disabled until provider credentials are ready; forms use Identity availability and fail closed to email-only. The later first bootstrap uses explicit `reset_data=true`; after successful bootstrap, retries use `reset_data=false`. Target ownership, database and signing preflight must pass before staging is declared ready. See backend `docs/reference/staging-release.md`.
