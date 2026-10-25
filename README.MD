# Edaya Web

Bun and Turborepo monorepo for the Edaya staff webapp and platform webadmin.

## Repository layout

| Location | Responsibility |
| --- | --- |
| [apps/webapp](apps/webapp/README.md) | School staff UI |
| [apps/webadmin](apps/webadmin/README.md) | Platform operator UI; tenant, user and billing workflows remain placeholders |
| [tooling/repo](tooling/repo/README.md) | Repository commands, verification, backend-client preparation and releases |
| `tooling/web-fixtures` | Shared test constants and development demo accounts |
| [design-system](design-system/README.md) | Canonical tokens and bundled asset inventories |
| [docs/specs](docs/specs/documentation-spec.md) | Six normative implementation contracts, indexed by [AGENTS.md](AGENTS.md) |
| `.generated/api-client` | Ignored API client built from one resolved backend commit |

Engineering guides live in the README nearest their code. Plans, audit reports, historical QA packs, client onboarding material and design captures are archived outside this repository. Generated evidence belongs in ignored output directories; it is not a requirement source.

## Prerequisites and first-time setup

Use Bun **1.3.14** (the root `packageManager` pin), Git, and Node.js 22+ for the third-party Wrangler CLI. Backend access is required to prepare the generated API client. Local integration also needs the backend service prerequisites described in its own README; ordinary app unit tests use in-repository fixtures.

From this repository root:

```sh
bun run repo generate client staging
bun run repo generate dependencies
bun run repo generate setup
bun run repo check
```

Client preparation resolves backend `staging` by default and builds `.generated/api-client`; the dependency step installs both applications against that same package. Production preparation selects backend `main`. Use `--backend-root <clean-checkout>` for an existing backend checkout or `--ref <branch-or-commit>` for a local override; these options are mutually exclusive. See [backend inputs and setup](tooling/repo/README.md#backend-inputs-and-setup).

There is no published or committed vendored client. Prepare the client before dependency installation on a fresh checkout.

## Local development

Start a local API using the [backend development instructions](https://github.com/Maya-Invest/edaya_backend/blob/main/README.md). A sibling checkout at `../edaya_backend` is convenient. Configure each app from its `.env.example`; `API_URL` and `PUBLIC_API_URL` must refer to the same API origin (default `http://localhost:9999`).

```sh
bun repo dev
```

This checks the prepared client and starts both frontends. The repository development command enables explicit test-OTP controls by default; set `PUBLIC_TEST_OTP_ACCESS=false` to disable them. The backend must also advertise capture support. Direct workspace development commands use their own environment configuration.

| Application | Local URL | Single-app command |
| --- | --- | --- |
| Staff webapp | http://localhost:5173 | `bun run dev:webapp` |
| Webadmin | http://localhost:5174 | `bun run dev:webadmin` |

See the [webapp README](apps/webapp/README.md#local-demo-access) for passwordless demo access.

## Verification and commands

| Command | Purpose |
| --- | --- |
| `bun repo --help` | Repository command groups; every command supports `--help` |
| `bun run verify` | Repository/workflow checks, tooling tests, lint, type checks, builds and unit tests |
| `bun repo check` | Repository, documentation, client, brand and architecture checks |
| `bun run quality` | Workspace lint and type checks |
| `bun run test` | Workspace unit and state tests |
| `bun run build` | Workspace builds |
| `bun repo test integration` | Supervised browser suites using the prepared backend revision |
| `bun run screenshots --list` | List available screenshot checkpoints |
| `bun repo ops smoke staging` | Read-only HTTP smoke against staging |

The [tooling README](tooling/repo/README.md) owns the complete generated command reference and CI/release procedure. The [webapp tests README](apps/webapp/tests/README.md) explains test authoring, local prerequisites and screenshot evidence.

## Deployment

Both apps deploy static assets on Cloudflare Workers. Set `PUBLIC_API_URL` at build time.

| App | Production | Staging |
| --- | --- | --- |
| Webapp | `app.edayaplus.com` | `staging.app.edayaplus.com` |
| Webadmin | `admin.edayaplus.com` | `staging.admin.edayaplus.com` |

PRs qualify without deploying. Pushes to `main` and `staging` qualify their exact revision before the environment deployment job can run; deployment requires the repository adoption gate. Release restoration validates the qualified source, dependencies and artifacts without rebuilding. See [CI and release procedure](tooling/repo/README.md#ci-and-release-procedure).
