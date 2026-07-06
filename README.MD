# Edaya Web

Monorepo for Edaya web frontends: **Bun** workspaces and **Turborepo** orchestration.

## Layout

```text
edaya_web/
├── apps/
│   ├── webapp/              @edaya/webapp — school staff UI (Cloudflare Workers)
│   └── saas-admin/          @edaya/saas-admin — platform operator UI (Cloudflare Workers)
├── packages/
│   ├── api-client/          (in-app) `apps/webapp/src/generated/api-client` — typed API SDK
│   └── web-fixtures/        @edaya/web-fixtures — dev test constants + demo login data
└── tooling/
    └── repo/                @edaya/web-repo — OpenAPI export + client codegen
```

## Prerequisites

- [Bun](https://bun.sh) 1.3+ (see `packageManager` in root `package.json`)
- [edaya_backend](https://github.com/Maya-Invest/edaya_backend) checked out as a sibling directory (`../edaya_backend`) for OpenAPI **export** and local API proxy only (not required for CI)

`@edaya/client-codegen` is installed from [github.com/Maya-Invest/edaya-client-codegen](https://github.com/Maya-Invest/edaya-client-codegen) (`dev` branch) at install time — no sibling checkout needed.

See [docs/reference/cross-repo-workflow.md](./docs/reference/cross-repo-workflow.md) for **pair PRs** (backend API change → export OpenAPI → `bun run openapi:generate` → `bun run verify`), codegen releases, and staging smoke.

See [docs/reference/demo-accounts.md](./docs/reference/demo-accounts.md) for local login accounts (staff webapp vs portal teachers).

## First-time setup

```sh
bun install

cp apps/webapp/.env.example apps/webapp/.env
cp apps/saas-admin/.env.example apps/saas-admin/.env
```

## Local development

Start the API from **edaya**, then the web apps from here:

```sh
# Terminal 1 — API (+ local-files)
cd ../edaya_backend && bun dev

# Terminal 2 — both web apps
bun dev
```

| Service | URL |
|---------|-----|
| Webapp | http://localhost:5173 |
| SaaS Admin | http://localhost:5174 |

Or run a single app:

```sh
bun run dev:webapp
bun run dev:saas-admin
```

Dev servers proxy `/core`, `/auth`, `/public`, and API docs to `API_URL` (default `http://localhost:9999`).

## Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start webapp + saas-admin in watch mode |
| `bun run dev:webapp` | School staff UI only |
| `bun run dev:saas-admin` | SaaS admin only |
| `bun run build` | Build all apps |
| `bun run check` | Type-check all apps |
| `bun run quality` | Lint + type-check |
| `bun run test` | Run repo + app tests |
| `bun run verify` | Non-mutating release check (lint, check, tests, generated drift, build) |
| `bun run export-openapi` | Export OpenAPI from Edaya Core API (requires sibling `edaya`) |
| `bun run openapi:generate` | Export OpenAPI, regenerate `schema.d.ts` + client bindings |
| `bun run generated:check` | Fail if generated API artifacts are stale (committed OpenAPI only) |
| `bun run generated:check:export` | Same, but compare against live export from sibling `edaya` |
| `bun run smoke:staging` | HTTP smoke against staging SPA shells |
| `bun run deploy:webapp:production` | Build + deploy webapp (production) |
| `bun run deploy:webapp:staging` | Build + deploy webapp (staging) |
| `bun run deploy:saas-admin:production` | Build + deploy SaaS admin (production) |
| `bun run deploy:saas-admin:staging` | Build + deploy SaaS admin (staging) |

## Deployment

Both apps are static SvelteKit SPAs on Cloudflare Workers (assets):

| App | Production | Staging |
|-----|------------|---------|
| Webapp | `app.edaya.softilab.dev` | `app-staging.edaya.softilab.dev` |
| SaaS Admin | `admin.edaya.softilab.dev` | `admin-staging.edaya.softilab.dev` |

Set `PUBLIC_API_URL` at build time when the API is not same-origin.

## API client generation

The `@edaya/web-repo` tooling exports the OpenAPI document from the sibling **Edaya Core** API, then regenerates:

| Output | Path |
|--------|------|
| OpenAPI JSON (canonical) | `apps/webapp/src/lib/api/openapi.json` |
| TypeScript schemas | `apps/webapp/src/lib/api/schema.d.ts` |
| SaaS admin copy | `apps/saas-admin/src/lib/api/openapi.json` + `schema.d.ts` (synced on generate) |
| Client bindings | `apps/webapp/src/generated/api-client/generated/client-bindings.ts` |

```sh
# from edaya_web root — requires ../edaya_backend with dependencies installed
bun run openapi:generate
```

Override the core repo location with `EDAYA_CORE_ROOT` when needed.

## Roadmap

1. **SaaS admin** — platform operator auth, tenant directory, billing, support tooling.
2. **Shared UI** — extract common Tailwind/Bits components into `packages/ui` where it makes sense.
3. **Production cutover** — deploy web apps from `edaya_web` and retire legacy `edaya` webapp paths.
