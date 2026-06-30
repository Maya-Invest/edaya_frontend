# Edaya Web

Monorepo for Edaya web frontends: **Bun** workspaces and **Turborepo** orchestration.

The school staff UI (`@edaya/webapp`) still lives in [edaya](https://github.com/softilab/edaya) for now. This repo starts with the **SaaS admin** console; the webapp migration is planned separately.

## Layout

```text
edaya_web/
├── apps/
│   └── saas-admin/          @edaya/saas-admin — platform operator UI (Cloudflare Pages)
├── packages/
│   └── api-client/          @edaya/api-client — typed API SDK (generated bindings)
└── tooling/
    └── repo/                @edaya/web-repo — OpenAPI export + client codegen
```

## Prerequisites

- [Bun](https://bun.sh) 1.3+ (see `packageManager` in root `package.json`)
- [edaya](https://github.com/softilab/edaya) checked out as a sibling directory (`../edaya`) for OpenAPI export and client generation

## First-time setup

```sh
bun install

cp apps/saas-admin/.env.example apps/saas-admin/.env
```

## Local development

```sh
bun dev
```

| Service | URL |
|---------|-----|
| SaaS Admin | http://localhost:5174 |

The dev server proxies `/core`, `/auth`, `/public`, and API docs to `API_URL` (default `http://localhost:9999`). Run the Edaya Core API from the main `edaya` repo when integrating platform endpoints.

Or run the app directly:

```sh
cd apps/saas-admin && bun dev
```

## Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start SaaS admin in watch mode |
| `bun run build` | Build all apps |
| `bun run check` | Type-check all apps |
| `bun run quality` | Lint + type-check |
| `bun run lint` | ESLint across apps |
| `bun run test` | Run repo + app tests |
| `bun run export-openapi` | Export OpenAPI from Edaya Core API |
| `bun run openapi:generate` | Export OpenAPI, regenerate `schema.d.ts` + client bindings |
| `bun run generated:check` | Fail if generated API artifacts are stale |
| `bun run deploy:saas-admin` | Build + deploy SaaS admin (production) |
| `bun run deploy:saas-admin:staging` | Build + deploy SaaS admin (staging) |

## Deployment

SaaS admin is a static SvelteKit SPA deployed to Cloudflare Workers (assets):

- Production: `admin.edaya.softilab.dev`
- Staging: `admin-staging.edaya.softilab.dev`

Set `PUBLIC_API_URL` at build time when the API is not same-origin.

## API client generation

The `@edaya/web-repo` tooling package mirrors `edaya/tooling/repo`. It exports the OpenAPI document from the sibling **Edaya Core** API, then regenerates:

| Output | Path |
|--------|------|
| OpenAPI JSON | `apps/saas-admin/src/lib/api/openapi.json` |
| TypeScript schemas | `apps/saas-admin/src/lib/api/schema.d.ts` |
| Client bindings | `packages/api-client/src/generated/client-bindings.ts` |

```sh
# from edaya_web root — requires ../edaya with dependencies installed
bun run openapi:generate
```

Override the core repo location with `EDAYA_CORE_ROOT` when needed.

## Roadmap

1. **SaaS admin** — platform operator auth, tenant directory, billing, support tooling.
2. **Webapp migration** — move `@edaya/webapp` from `edaya` into `apps/webapp` with shared `packages/ui` where it makes sense.
