# Edaya Web

Monorepo for Edaya web frontends: **Bun** workspaces and **Turborepo** orchestration.

## Layout

```text
edaya_web/
├── apps/
│   ├── webapp/              @edaya/webapp — school staff UI (Cloudflare Workers)
│   └── saas-admin/          @edaya/saas-admin — platform operator UI (Cloudflare Workers)
├── packages/
│   └── web-fixtures/        @edaya/web-fixtures — dev test constants + demo login data
└── tooling/
    └── repo/                @edaya/web-repo — repo hygiene + smoke tests
```

## Prerequisites

- [Bun](https://bun.sh) 1.3+ (see `packageManager` in root `package.json`)
- [edaya_backend](https://github.com/Maya-Invest/edaya_backend) checked out as a sibling directory (`../edaya_backend`) for `@maya-invest/edaya-api-client` (file link) and local API proxy

See [docs/reference/cross-repo-workflow.md](./docs/reference/cross-repo-workflow.md) for API client updates, codegen in backend, and staging smoke.

See [docs/reference/demo-accounts.md](./docs/reference/demo-accounts.md) for local login accounts (staff webapp vs portal teachers).

## First-time setup

```sh
bun install
bun repo doctor
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

**Development and ops:** [`bun repo`](./docs/reference/repo-cli.md) — smoke tests, repo hygiene. **No Turbo in `bun repo`** — use root scripts below.

**Turbo quality** (root `package.json`):

| Command | Description |
|---------|-------------|
| `bun dev` | Start webapp + saas-admin in watch mode |
| `bun run dev:webapp` | School staff UI only |
| `bun run dev:saas-admin` | SaaS admin only |
| `bun run verify` | Pre-PR gate: `bun repo verify` + quality + build + test |
| `bun run lint` | ESLint across workspaces |
| `bun run lint:fix` | ESLint with auto-fix |
| `bun run check` | Type-check all apps |
| `bun run test` | Unit tests (Turbo) |
| `bun run build` | Build all apps |
| `bun run quality` | Lint + type-check per package |
| `bun repo smoke-test staging` | HTTP smoke against staging SPA shells |
| `bun run deploy:webapp:staging` | Build + deploy webapp (staging) |
| `bun run deploy:saas-admin:staging` | Build + deploy SaaS admin (staging) |

### Pre-PR verification

```sh
bun run verify               # pre-PR gate (CI verify job)
bun repo verify              # repo hygiene only
```

Full command tree: **[docs/reference/repo-cli.md](./docs/reference/repo-cli.md)**. CI details: **[docs/reference/ci-setup.md](./docs/reference/ci-setup.md)**.

## Deployment

Both apps are static SvelteKit SPAs on Cloudflare Workers (assets):

| App | Production | Staging |
|-----|------------|---------|
| Webapp | `app.edaya.softilab.dev` | `app-staging.edaya.softilab.dev` |
| SaaS Admin | `admin.edaya.softilab.dev` | `admin-staging.edaya.softilab.dev` |

Set `PUBLIC_API_URL` at build time when the API is not same-origin.

## API client

Typed API runtime and schema types come from **`@maya-invest/edaya-api-client`** (generated in `edaya_backend/package/api-client/`).

Web apps re-export schema types at `$lib/api/schema` for convenience. After backend API changes, regenerate the client in **edaya_backend** (`bun repo openapi generate`), then run `bun install` here to pick up the updated file link.

See [docs/reference/cross-repo-workflow.md](./docs/reference/cross-repo-workflow.md).

## Roadmap

1. **SaaS admin** — platform operator auth, tenant directory, billing, support tooling.
2. **Shared UI** — extract common Tailwind/Bits components into `packages/ui` where it makes sense.
3. **Production cutover** — deploy web apps from `edaya_web` and retire legacy `edaya` webapp paths.
