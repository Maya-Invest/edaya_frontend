# Edaya Webapp

SvelteKit staff UI for Edaya Core.

## Local development

```sh
cp .env.example .env   # from apps/webapp
bun dev                # http://localhost:5173
```

Requires the API running at `API_URL` (the Vite development proxy target, default `http://localhost:9999`). Leave `PUBLIC_API_URL` empty locally so browser requests use the same-origin proxy. From the repo root, `bun dev` starts both apps. Start the API from `edaya_backend` with `bun dev` (PGlite + local-files).

## Quality gates

From the repo root:

```sh
bun run verify    # non-mutating lint, check, build, generated drift, boundaries, tests
bun run lint:fix  # lint:fix when needed
```

Webapp-only: `bun run --cwd apps/webapp quality` (lint + svelte-check + test typecheck).
