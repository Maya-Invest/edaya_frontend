# Edaya Webapp

SvelteKit staff UI for Edaya Core.

## Local development

```sh
cp .env.example .env   # from apps/webapp
bun dev                # http://localhost:5173
```

Requires the API running at `API_URL` (default `http://localhost:9999`). Set `PUBLIC_API_URL` to that same origin; the browser exchanges `{ "resource": "<that origin>" }` for a JWT whose `aud` matches. From the repo root, `bun dev` starts both apps. Start the API from `edaya_backend` with `bun dev` (PGlite + local-files).

## Quality gates

From the repo root:

```sh
bun run verify    # non-mutating lint, check, build, generated drift, boundaries, tests
bun run lint:fix  # lint:fix when needed
```

Webapp-only: `bun run --cwd apps/webapp quality` (lint + svelte-check + test typecheck).

## UI work

Use the [EDAYA UI brief](../../docs/reference/edaya-ui-brief.md), [web design-language specification](../../docs/specs/design-language-spec.md) and [component registry](../../docs/specs/shared-components-spec.md). The staff webapp uses bundled fonts, supplied logo artwork and generated local tokens. `bun run brand:check` at repository root checks token, asset and color drift.

The development-only `/__design` gallery composes production list, detail and form primitives with isolated fixtures; it returns 404 in production. [Current captures](../../docs/reference/design-review/README.md) record source and viewing conditions. Preserve auth, routes, permissions, data and effective UI structures during styling work.
