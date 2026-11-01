# Edaya Webapp

SvelteKit staff workspace for school administration. Teachers, guardians and students are managed here; their portal accounts use their respective applications.

## Local development

Complete [repository setup](../../README.MD#prerequisites-and-first-time-setup), then copy `.env.example` to `.env` in this app if local overrides are needed. Start the local backend using its README. `API_URL` and `PUBLIC_API_URL` must identify the same API origin (default `http://localhost:9999`); browser access tokens use that origin as their resource/audience.

From the frontend root, `bun repo dev` starts both apps and enables explicit test-OTP controls unless `PUBLIC_TEST_OTP_ACCESS=false`. To start only this app with captured-code controls:

```sh
PUBLIC_TEST_OTP_ACCESS=true PUBLIC_APP_ENV=development bun run dev:webapp
```

The staff UI is available at http://localhost:5173. Normal release builds disable test-OTP access.

## Local demo access

Use a disposable local backend with the `demo-ci` fixtures and captured OTP delivery, following the backend's current preparation instructions. Do not reset an existing database just to run a demo. `/login/demo` is available only in development; it prefills the shared passwordless form and never signs in automatically. Send the OTP, reveal/copy the test code explicitly when the backend advertises capture support, then verify it normally. Portal teachers are not included in this picker.

The source of picker identities is [`tooling/web-fixtures/src/demo-login.ts`](../../tooling/web-fixtures/src/demo-login.ts):

| Email | Display role |
| --- | --- |
| `a.kone@ecole-ci.edaya.dev` | School owner |
| `j.aka@ecole-ci.edaya.dev` | Director |
| `f.assi@ecole-ci.edaya.dev` | Deputy director / staff coordinator |
| `m.zongo@ecole-ci.edaya.dev` | Educator |

Role labels do not grant permissions. After backend grant or assignment changes, check teacher names in timetables and teacher drawers; forbidden optional enrichment must degrade gracefully.

## Verification

From the frontend root, `bun run verify` runs repository checks, quality, builds, tooling tests and application unit/state tests. App-only quality is `bun run --cwd apps/webapp quality`. Browser workflows and capture prerequisites are documented in [tests/README.md](tests/README.md).

## UI development

Read the relevant [six implementation specs](../../AGENTS.md) before changing product behavior. Compose existing list, drawer, form and smart components. The development-only `/__design` gallery uses production primitives with isolated fixtures and returns 404 in production.

The staff webapp uses bundled Poppins/Inter fonts, supplied logos and generated semantic tokens. See [design-system maintenance](../../design-system/README.md) for token/asset checks and ignored visual evidence. UI-only styling preserves authentication, routes, permissions, data, fields and working layouts.
