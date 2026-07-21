# Webadmin

SvelteKit platform operator UI for Edaya.

## Local development

```sh
cp .env.example .env   # from apps/webadmin
bun dev                # http://localhost:5174
```

Requires the Edaya Core API at `API_URL` when calling platform endpoints (default `http://localhost:9999` via Vite proxy).

## Quality gates

From the repo root:

```sh
bun run quality
```

App-only:

```sh
bun run --cwd apps/webadmin quality
```
