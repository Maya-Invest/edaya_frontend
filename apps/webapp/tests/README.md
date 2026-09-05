# Webapp tests (`apps/webapp/tests`)

Unit and integration-style tests for the staff webapp. Run from `apps/webapp`:

```sh
bun test tests
```

## Layout

```text
tests/
├── fixtures/         # In-repo data (Ivory Coast catalog JSON) — not edaya_backend
├── lib/              # Pure helpers, mutations, queries, navigation
├── support/          # Shared fixtures, SvelteKit + $state stubs, harness utilities
└── README.md
```

- **`tests/lib/**`** — mirror `src/lib/**` where practical (`api/`, `auth/`, `onboarding/`, …).
- **`tests/support/**`** — OpenAPI fixtures, recording school client, SvelteKit mocks. Import via `$tests/support/...`.

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
3. **Mocks before dynamic import** — when testing `runMutation` callers, the preload already stubs `$lib/toast.svelte`; still mock `$lib/api/school-client` then `await import('...mutations')`.
4. **In-repo fixtures** — catalog coverage reads `tests/fixtures/ivory-coast/`, not a sibling `edaya_backend` tree.

`tests/lib/ci-parity-guard.test.ts` fails locally if a new test reintroduces a backend path or a static `$state` / `run-mutation` import.

CI still installs the **published** `@maya-invest/edaya-api-client`; local `bun run verify` keeps the `file:` sibling. Quality/build would fail first if that client were wrong.

## Adding tests

- Colocate with the domain under `tests/lib/<domain>/`.
- Use `@edaya/web-fixtures` / `tests/support/openapi-fixtures.ts` for stable IDs.
- Keep component tests rare; favor stateless modules and mutation store actions.
