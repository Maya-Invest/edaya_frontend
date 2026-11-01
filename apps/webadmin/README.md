# Edaya Webadmin

SvelteKit platform operator UI. Tenant, user and billing routes currently remain placeholders; browser coverage verifies registered navigation and those placeholders, not completed business workflows.

## Local development

Complete [repository setup](../../README.MD#prerequisites-and-first-time-setup) before installing or starting the app. Both web applications consume the same prepared `.generated/api-client`.

Copy this app's `.env.example` to `.env` when overrides are needed. `API_URL` and `PUBLIC_API_URL` identify the same unified API origin (default `http://localhost:9999`). The development server proxies API requests there.

From the frontend root:

```sh
bun run dev:webadmin
```

The application listens at http://localhost:5174. `bun repo dev` starts both frontends.

## Verification and release

`bun run --cwd apps/webadmin quality` checks this application. Root `bun run verify` includes both apps; `bun repo test integration` includes the webadmin navigation suite. See [tooling](../../tooling/repo/README.md) for qualification and deployment, and [webapp testing](../webapp/tests/README.md) for the shared browser harness.
