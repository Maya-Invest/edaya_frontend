# Webapp tests (`apps/webapp/tests`)

Unit tests and Playwright integration suites for the staff webapp. Run from `apps/webapp`.

## Unit

```sh
bun test tests/lib
```

## Layout

```text
tests/
├── fixtures/         # In-repo data (Ivory Coast catalog JSON) — not edaya_backend
├── lib/              # Pure helpers, mutations, queries, navigation
├── integration/      # Playwright library runners (not bun:test, not bun run verify)
│   ├── onboarding/   # Login + onboarding Playwright suite
│   ├── setup/        # Provisioned owner journey
│   └── demo-dry-run/ # Seeded demo-ci walkthrough (`demo:e2e`). Keeps seeded drawers and permissions; it does not re-walk the route catalog.
├── support/          # Shared fixtures, SvelteKit + $state stubs, harness utilities
└── README.md
```

- **`tests/lib/**`** — mirror `src/lib/**` where practical (`api/`, `auth/`, `onboarding/`, …).
- **`tests/support/**`** — OpenAPI fixtures, recording school client, SvelteKit mocks. Import via `$tests/support/...`.
Use the dedicated backend `bun run dev:test` server for local captured email, WhatsApp and SMS. Enable web `PUBLIC_TEST_OTP_ACCESS=true` or Flutter debug `--dart-define=TEST_OTP_ACCESS=true` for explicit Show test code and Copy controls. CI uses that composition and a private captured mailbox; normal staging/production builds omit testing access.
- **`tests/integration/setup/**`** — `bun run test:integration:provisioned` (API-completes the wizard, then owner UI). Secondary teacher/educator invites must actually activate; a missing token or owner-link fallback fails the run.

Local login + onboarding suite (Identity `:9900`, school `:9999` empty, webapp `:5173`):

```sh
bun run test:integration:onboarding
```

CI-shaped (Wrangler preview):

```sh
WEBAPP_URL=http://127.0.0.1:4173 WEBAPP_READINESS_PATH=/login bun run test:integration:onboarding
```

Scenes (fail-the-process): public gates, login/signup validation + verification UI, unknown invite token, wizard step interactions, owner wizard resume (reload / second tab / post-provision lock), happy-path provision with a valid staff invite, invited staff (new account + existing account), wrong-account / revoked / already-accepted invites, invited teacher, invited guardian, owner relogin. Expired 7-day invite TTL is a documented gap (no expire command).

Artifacts: `apps/webapp/.onboarding-run/` (screenshots + `summary.json` on failure).

## Imports

`tsconfig.test.json` and `svelte.config.js` define:

| Alias | Resolves to |
|-------|-------------|
| `$lib/*` | `src/lib/*` |
| `$tests/*` | `tests/*` |
| `$api-client` | `src/generated/api-client` |

## `.svelte.ts` and entity store

GitHub Actions checks out **only** `edaya_web` and runs bun test on Linux. Do **not** import `DetailDataContext` or other `$state` singletons in tests — Linux bun does not compile runes outside a component.

[`tests/support/sveltekit-mocks.ts`](./support/sveltekit-mocks.ts) (bun preload) stubs toast, session, entity-versions, and academic/onboarding context so those files never execute.

Prefer:

1. **Pure helpers** — test mapping/codec functions with fixtures (`tests/lib/api/*-data.test.ts`).
2. **Mutation apply/rollback** — extract the patch logic or mirror it with a small in-memory store (`tests/lib/api/mutations/mutation-store-actions.test.ts`). Do not import `run-mutation.ts`.
3. **Mocks before dynamic import** — do not `await import` mutation files that pull `run-mutation.ts` (toast/session). Test payload helpers instead (`student-ops.payload.ts`). When a test must load a mutation module, mock `$lib/api/school-client` first.
4. **In-repo fixtures** — catalog coverage reads `tests/fixtures/ivory-coast/`, not a sibling `edaya_backend` tree.

`tests/lib/ci-parity-guard.test.ts` fails locally if a new test reintroduces a backend path or a static `$state` / `run-mutation` import.

CI still installs the **published** `@maya-invest/edaya-api-client`; local `bun run verify` keeps the `file:` sibling. Quality/build would fail first if that client were wrong.

## Adding tests

Keep a unit test when it locks a branch a developer can get wrong, it is the cheapest suite that locks that branch, and no lower layer already asserts the same inputs and outcome. Line coverage is not a reason to add a test.

- Colocate with the domain under `tests/lib/<domain>/`.
- Use `@edaya/web-fixtures` / `tests/support/openapi-fixtures.ts` for stable IDs.
- Keep component tests rare; favor stateless modules and mutation store actions.
- Do not add `empty*Slice()` tests. TypeScript already types those literals.
- New import packs add validator and runner tests. Add a parser test only for a branch the shared parser harness misses (Excel serial dates, optional columns, header aliases).
- Catalog drift belongs in `tests/lib/catalog-drift.test.ts`. Do not add a second journey, matrix, or scene-id coverage file.
