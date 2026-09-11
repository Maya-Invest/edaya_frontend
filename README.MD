# Edaya Web

Monorepo for Edaya web frontends: **Bun** workspaces and **Turborepo** orchestration.

## Layout

```text
edaya_web/
├── apps/
│   ├── webapp/              @edaya/webapp — school staff UI (Cloudflare Workers)
│   ├── webadmin/            @edaya/webadmin — platform operator UI (Cloudflare Workers)
│   └── website/             @edaya/website — marketing / coming soon (Astro, Cloudflare Workers)
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
| Webadmin | http://localhost:5174 |
| Website | http://localhost:4321 |

Or run a single app:

```sh
bun run dev:webapp
bun run dev:webadmin
bun run dev:website
```

Dev servers proxy `/auth` to `AUTH_URL` (default `http://localhost:9900`) and `/core`, `/public`, and API docs to `API_URL` (default `http://localhost:9999`).

## Commands

**Development and ops:** [`bun repo`](./docs/reference/repo-cli.md) — smoke tests, repo hygiene. **No Turbo in `bun repo`** — use root scripts below.

**Turbo quality** (root `package.json`):

| Command | Description |
|---------|-------------|
| `bun dev` | Start webapp + webadmin in watch mode |
| `bun run dev:webapp` | School staff UI only |
| `bun run dev:webadmin` | Webadmin only |
| `bun run verify` | Pre-PR gate: `bun repo verify` + quality + build + test |
| `bun run lint` | ESLint across workspaces |
| `bun run lint:fix` | ESLint with auto-fix |
| `bun run check` | Type-check all apps |
| `bun run test` | Unit tests (Turbo) |
| `bun run build` | Build all apps |
| `bun run quality` | Lint + type-check per package |
| `bun repo smoke-test staging` | HTTP smoke against staging SPA shells |
| `bun run deploy:webapp:staging` | Build + deploy webapp (staging) |
| `bun run deploy:webadmin:staging` | Build + deploy webadmin (staging) |
| `bun run dev:website` | Astro coming-soon site only |
| `bun run deploy:website:staging` | Build + deploy website (staging) |

### Pre-PR verification

```sh
bun run verify               # pre-PR gate (CI verify job)
bun repo verify              # repo hygiene only
```

Full command tree: **[docs/reference/repo-cli.md](./docs/reference/repo-cli.md)**. CI details: **[docs/reference/ci-setup.md](./docs/reference/ci-setup.md)**.

## Deployment

Apps are static sites on Cloudflare Workers (assets):

| App | Production | Staging |
|-----|------------|---------|
| Website | `edayaplus.com`, `www.edayaplus.com` | `staging.edayaplus.com` |
| Webapp | `app.school.edayaplus.com` | `staging.app.school.edayaplus.com` |
| Webadmin | `admin.edayaplus.com` | `staging.admin.edayaplus.com` |

Set the required `PUBLIC_AUTH_URL` and `PUBLIC_API_URL` at build time.

## API client

Typed API runtime and schema types come from **`@maya-invest/edaya-api-client`** (generated in `edaya_backend/package/api-client/`).

Web apps re-export schema types at `$lib/api/schema` for convenience. After backend API changes, regenerate the client in **edaya_backend** (`bun repo openapi generate`), then run `bun install` here to pick up the updated file link.

See [docs/reference/cross-repo-workflow.md](./docs/reference/cross-repo-workflow.md).

## Roadmap

1. **Webadmin** — platform operator auth, tenant directory, billing, support tooling.
2. **Shared UI** — extract common Tailwind/Bits components into `packages/ui` where it makes sense.
3. **Production cutover** — deploy web apps from `edaya_web` and retire legacy `edaya` webapp paths.
