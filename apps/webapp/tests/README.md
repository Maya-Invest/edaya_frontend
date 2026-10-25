# Webapp tests (`apps/webapp/tests`)

Unit tests and Playwright integration suites for the staff webapp. Run from `apps/webapp`.

## Unit

```sh
bun run test
```

## Layout

```text
tests/
├── fixtures/         # In-repo data (Ivory Coast catalog JSON) — not edaya_backend
├── lib/              # Pure helpers, mutations, queries, navigation
├── integration/      # Browser runners plus isolated Bun state tests
│   ├── onboarding/   # Login + onboarding Playwright suite
│   ├── setup/        # Provisioned owner journey
│   └── demo-dry-run/ # Seeded demo-ci walkthrough (`demo:e2e`). Keeps seeded drawers and permissions; it does not re-walk the route catalog.
├── support/          # Shared fixtures, SvelteKit + $state stubs, harness utilities
└── README.md
```

- **`tests/lib/**`** — mirror `src/lib/**` where practical (`api/`, `auth/`, `onboarding/`, …).
- **`tests/support/**`** — OpenAPI fixtures, recording school client, SvelteKit mocks. Import via `$tests/support/...`.
Use the backend `bun repo dev` server for local captured email, WhatsApp and SMS. Enable web `PUBLIC_TEST_OTP_ACCESS=true` or Flutter debug `--dart-define=TEST_OTP_ACCESS=true` for explicit Show test code and Copy controls. CI uses the separate internal testing composition and a private captured mailbox; normal staging/production builds omit testing access.
- **`tests/integration/setup/**`** — `bun run test:integration:provisioned` (API-completes the wizard, then owner UI). Secondary teacher/educator invites must actually activate; a missing token or owner-link fallback fails the run.

Local login + onboarding suite (unified API `:9999` with empty school storage, webapp `:5173`):

```sh
bun run test:integration:onboarding
```

CI-shaped (Wrangler preview):

```sh
WEBAPP_URL=http://127.0.0.1:4173 WEBAPP_READINESS_PATH=/login bun run test:integration:onboarding
```

Scenes (fail-the-process): public gates, login/signup validation + verification UI, unknown invite token, wizard step interactions, owner wizard resume (reload / second tab / post-provision lock), happy-path provision with a valid staff invite, invited staff (new account + existing account), wrong-account / revoked / already-accepted invites, invited teacher, invited guardian, owner relogin.

Artifacts: `apps/webapp/.onboarding-run/` (screenshots + `summary.json` on failure).

## Imports

`tsconfig.test.json` and `svelte.config.js` define:

| Alias | Resolves to |
|-------|-------------|
| `$lib/*` | `src/lib/*` |
| `$tests/*` | `tests/*` |
| `@maya-invest/edaya-api-client` | Prepared package in the repository-root `.generated/api-client` |

## Svelte state tests and API inputs

CI and local verification install the same API package prepared from an immutable backend SHA. CI also checks out that backend for generation and supervised integration; application unit fixtures do not read a sibling checkout. See [client preparation](../../../tooling/repo/README.md#backend-inputs-and-setup).

[`support/sveltekit-mocks.ts`](support/sveltekit-mocks.ts), loaded by Bun's app-level configuration, stubs SvelteKit/session/toast dependencies for pure tests. `tests/lib/ci-parity-guard.test.ts` rejects eager rune-state and mutation-runner imports and sibling-backend reads in the pure unit suite.

Use pure mapping, payload and mutation helpers in `tests/lib/`. Exercise the actual implementation with mocks rather than copying its algorithm into a test. For rune-backed route/smart state, follow the isolated `tests/integration/*.test.ts` suites: register a Bun plugin using Svelte's `compileModule`, install mocks before dynamic imports, and run each suite separately as listed in the app's `test` script. Browser runners exercise navigation and persisted behavior separately.

## Adding tests

Keep a unit test when it locks a branch a developer can get wrong, it is the cheapest suite that locks that branch, and no lower layer already asserts the same inputs and outcome. Line coverage is not a reason to add a test.

- Colocate with the domain under `tests/lib/<domain>/`.
- Use `@edaya/web-fixtures` / `tests/support/openapi-fixtures.ts` for stable IDs.
- Keep component tests rare; favor stateless modules and mutation store actions.
- Do not add `empty*Slice()` tests. TypeScript already types those literals.
- Durable import behavior is tested through the generated backend API and browser workflow; parsing, matching and validation are backend responsibilities.
- Catalog drift belongs in `tests/lib/catalog-drift.test.ts`. Do not add a second journey, matrix, or scene-id coverage file.

## Shared scenarios and screenshot gallery

Onboarding, the provisioned owner journey and its unclaimed QA matrix, and the
seeded demo walkthrough use `integration/support/scenario-registry.ts`. Existing
commands and reports remain in `.onboarding-run/`, `.integration-run/` and
`.demo-dry-run/`. A failed dependency blocks its descendants; independent work
continues. Legacy returned failures are recorded as failures, including required
matrix actions. The provisioned journey ledger claims each exercised action once;
the matrix runs only remaining actions.

The integration profile runs every step and postcondition. The screenshot profile
stops at one declared checkpoint per execution. Earlier steps and checkpoint
readiness assertions still run, but neither a PNG nor an unsubmitted form earns
mutation or release coverage. Form mutations share `modalMutationSteps`; onboarding
shares `happyPathSteps` and `loginSignupSteps`. Screenshot view navigation and QA
route/modal assertions share `openViewSurface`.

### Local setup

Use a disposable local database and the dedicated backend testing entry point;
never point these fixture-producing runs at staging or production. From
`edaya_backend`, start `bun repo dev` with the local database configuration and
captured OTP mailbox, then run `bun repo seed --skip-attachments` against that
same API. Keep the local file service available if the seed has image references.
See the backend local development documentation for the database and mailbox
configuration. Do not reset an existing database to satisfy a missing prerequisite.

From `apps/webapp`, start the development server with testing access:

```sh
PUBLIC_TEST_OTP_ACCESS=true PUBLIC_APP_ENV=development bun run dev
```

Defaults are webapp `http://localhost:5173` and unified API/auth
`http://localhost:9999`. Override `WEBAPP_URL` and `API_URL` for another local
stack. The webapp's `API_URL`/`PUBLIC_API_URL` must refer to that same API. OTP
helpers need the matching `EDAYA_TEST_OTP_FILE` when they use the captured mailbox.
The runner validates local-only endpoints, service readiness, the seeded owner,
class and student. It resolves actual domain IDs and academic scope through
admitted reads and adds a fictional parent conversation if absent. It never wipes
local data. Onboarding accounts are unique disposable identities.

### Capture commands

Run from the frontend root:

```sh
bun run screenshots
bun run screenshots --list
bun run screenshots --device mobile,tablet --locale en --module school
bun run screenshots --scenario view.school.students.record.profile.modal.edit-profile --checkpoint edit-form
bun run screenshots --headed --out /tmp/edaya-review-new-run
```

`--device` accepts mobile (390 × 844), tablet (820 × 1180), desktop
(1440 × 1000). Defaults capture all three in French and English, using Chromium,
light mode and one isolated browser context per checkpoint/variant. `--module`
accepts a top-level feature (`auth`, `onboarding`, `school`, `classes`, `finance`,
`configuration`, `dashboard`, `account`, `shell`); `--scenario` matches an ID prefix;
`--checkpoint` matches an exact checkpoint ID. Filters combine. `--list` needs no
running services. `--out` must name a new directory, protecting previous evidence.

Each run writes ignored `apps/webapp/.screenshots/<run-id>/index.html`,
`manifest.json`, viewport PNGs and failure diagnostics. Open `index.html` directly
for search, module/language filters and device comparison. The manifest records
source revision/fingerprint, fixture identity, URL, viewport and image hashes.
Failed or blocked captures remain visible and exit unsuccessfully. Partial
results are saved after each capture. Normal fictional form values remain visible;
passwords, OTPs and marked secrets are masked. Fonts/images/layout settle before
capture and animations are disabled. Long forms have explicitly named scrolled
checkpoints. Previous dated runs remain separate from the ignored curated design-review directory.

To capture declared checkpoints while completing integration assertions:

```sh
bun run test:integration:onboarding --capture-checkpoints
bun run test:integration:provisioned --capture-checkpoints
SCENARIO_CAPTURE_CHECKPOINTS=true bun run demo:e2e
```

These use the same collector and put a gallery under the suite's `checkpoints/`
folder. Capture failure fails the scenario. Finish source edits before running a
suite or full gallery: execution metadata rejects results if source changes during
execution. Screenshots are an on-demand review aid; there is no baseline approval
or GitHub Actions visual-diff workflow.

### Authoring

Extend `ScenarioDefinition<BrowserScenarioContext>` with a stable `id`, `feature`,
`dependsOn`, `fixtureRequirements`, and ordered executable `steps`. Attach a
checkpoint with stable `id`, `title`, catalog `surface` and a `ready` assertion to
the step that reaches it. Keep submit/persistence steps after an edit-form
checkpoint. Actions and assertions must not branch on execution profile.

Use `createBrowserScenarioContext` for isolated scenarios and
`bindBrowserScenarioContext` for an explicitly shared journey session. Context
supplies page/browser helpers, service addresses, locale/viewport, fixture handles,
artifact location and `registerCleanup`. Register disposal immediately after
allocation; cleanup runs in reverse order even after setup or capture failures.
A suite owns a bound journey's primary context, while newly opened contexts belong
to their scenario. Observe secondary pages and capture them before closing on
failure so diagnostics describe the failing view. Never use environment variables
to pass scenario identity or mutable scenario state.

Add product routes, tabs and modal surfaces to
`integration/screenshots/surfaces.json` with their fixture target when required;
add multi-step workflows in `scenarios.ts`. `exclusions.json` records concrete
redirects, layout-only containers, legacy aliases and the development gallery.
`tests/lib/catalog-drift.test.ts` requires visual coverage or an explicit exclusion.
Update the existing catalog guard when introducing another workflow/tab catalog.

Validation: `bun test tests/lib/shared-scenario-runner.test.ts`, the existing
registry/catalog tests, all three integration commands, the complete six-variant
`bun run screenshots`, and frontend-root `bun run verify`. Inspect representative
sign-in, list, drawer, form and navigation PNGs after capturing.

## Durable imports and integration coverage

`integration/import-browser.ts` and `integration/support/import-workflows.ts` create current import fixtures on an isolated school. They cover the fifteen server-defined import kinds, session S/M/O behavior, validation, execution, reload and correction/template downloads. Run the registered `imports-ui` suite through supervised integration or the app's `test:integration:imports-ui` command with its configured local services. Download current templates from Configuration → Tools → Import; archived compatibility workbooks are not current templates.

`integration/features.json` and route/sidebar/modal catalogs identify required surfaces. New production routes, tabs and actions update both registration and executable assertions. Navigation-only checks do not cover mutations: submit, reload and inspect persisted results, including relevant denied operations. Missing fixtures, blocked required scenarios, unexpected skips, stale source fingerprints and interrupted runs fail qualification. Independent scenarios continue after another scenario fails.

Source-fresh execution metadata accompanies each suite. Sanitized reports are collected under repository-root `.ci-evidence/reports/`; private session/provisioning fixtures and OTP/recovery secrets are excluded. Never reuse success summaries from an older source revision. Real provider delivery, native platform behavior and future support-assisted recovery remain outside frontend browser qualification. Webadmin coverage is limited to its registered placeholder/navigation behavior.
