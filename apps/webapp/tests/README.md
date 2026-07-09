# Webapp tests (`apps/webapp/tests`)

Unit and integration-style tests for the staff webapp. Run from `apps/webapp`:

```sh
bun test tests
```

## Layout

```text
tests/
├── lib/              # Pure helpers, mutations, queries, navigation
├── support/          # Shared fixtures and harness utilities
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

Do **not** import `DetailDataContext` or other `$state` singletons directly in tests — `$state` is undefined outside a component context.

Prefer:

1. **Pure helpers** — test mapping/codec functions with fixtures (`tests/lib/api/*-data.test.ts`).
2. **Mutation apply/rollback** — extract the patch logic or mirror it with a small in-memory store + `runMutation` (`tests/lib/api/mutations/mutation-store-actions.test.ts`).
3. **Mocks before dynamic import** — when testing `runMutation` callers, mock `$lib/toast.svelte` and `$lib/auth/bootstrap-app` first, then `await import('...mutations')`.

## Adding tests

- Colocate with the domain under `tests/lib/<domain>/`.
- Use `@edaya/web-fixtures` / `tests/support/openapi-fixtures.ts` for stable IDs.
- Keep component tests rare; favor stateless modules and mutation store actions.
