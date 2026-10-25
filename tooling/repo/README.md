# Frontend repository tooling

`@edaya/web-repo` owns the typed Bun command tree, repository checks, backend-client preparation, supervised integrations and release artifacts. Invoke it from the frontend root with `bun repo`; use `--help` at any command depth. Workspace scripts such as `bun run check` perform different work from repository commands such as `bun repo check`.

## Backend inputs and setup

```sh
bun run repo generate client staging
bun run repo generate dependencies
bun run repo generate setup
bun run repo check
bun run verify
```

Production resolves backend `main`; staging resolves backend `staging`. Preparation resolves once and builds the TypeScript client from that immutable SHA into ignored `.generated/api-client`. Both apps consume that package. A moving backend branch cannot alter an already prepared client. The selected branch identifies tested source, not necessarily the deployed backend.

For local preparation, `--ref <branch-or-commit>` overrides the backend input, or `--backend-root <clean-checkout>` uses an existing resolved checkout. They are mutually exclusive. Integration verifies the checkout still matches the prepared client and has no tracked edits. CI normally selects the destination branch; the Manual validation workflow exposes a deliberate backend override.

`generate dependencies` installs and verifies dependencies against the prepared client. `generate setup` prepares SvelteKit inputs. Checks do not create local environment files or rewrite generated sources. Repeat preparation explicitly when changing backend input. Client cache identities include backend SHA, generator/runtime inputs and lockfiles; invalid checksum entries are rebuilt. Package-registry credentials are unnecessary.

## Checks and tests

`bun repo check` validates command documentation, the prepared client, brand assets/tokens, repository environment files, the six-spec documentation layout and frontend architecture. The doctor includes tracked and unignored new documentation, so new sprint/reference folders fail before commit. `bun repo check doctor` runs just environment and layout checks.

`bun run verify` additionally runs workflow lint, tooling tests, workspace quality, builds and unit tests. `bun repo test tooling` runs this package's Bun suite. `bun repo test integration` supervises disposable local services from the prepared backend revision and runs required browser suites with source-freshness and feature-coverage gates. See [webapp testing](../../apps/webapp/tests/README.md).

Bun is pinned in the root package manifest. Node.js 22+ runs the third-party Wrangler CLI; maintained frontend orchestration runs on Bun. Workflow validators use pinned versions and checked SHA-256 hashes. Local integrations also require the backend's native PostgreSQL/archive prerequisites.

## CI and release procedure

| Event | Behavior |
| --- | --- |
| PR into `main` or `staging` | Full qualification and integration; no deployment |
| Push to another branch | Full verification, including quality/build/unit tests; no browser qualification or deployment |
| Push to `staging` / `main` | Qualify that revision, then deploy to staging / production when enabled |
| Manual deployment | Select a source revision in the environment workflow; same qualification and deployment jobs |
| Manual validation | Select environment, source revision and optional backend override; never deploy |

Deployment is serialized per environment without cancelling active deployments. Failure, cancellation or skipped qualification cannot deploy. Restoration selects the unique qualified artifact from the same run and attempt, checks out its recorded source commit, restores frozen dependencies and verifies checksums. Deployment uses the existing build; it never resolves another backend branch or generates another client.

Configuration required in GitHub:

- `IDENTITY_CHECKOUT_TOKEN`: read-only contents access to `Maya-Invest/edaya_backend`, used solely for checkout.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`: environment deployment credentials/configuration.
- `ENABLE_INDEPENDENT_RELEASES=true`: repository adoption gate. Enable only after local verification, both environment builds, integration, artifact handoff and non-deploying GitHub rehearsals have passed.
- Branch protection: require the PR workflow's `qualification / Full validation` check, confirming its exact displayed name in GitHub. Replace obsolete coordinator/publication requirements only after the replacement succeeds.

Backend destination branches must contain the typed fixture command used by consumer integration. Backend API compatibility is checked through the resolved client; repository source changes do not require synchronized consumer releases.

```sh
bun repo ci qualify staging
bun repo ci deploy staging --dry-run
```

Qualification requires committed source and runs verification, integration and build. A deployment dry run still requires valid qualified artifacts. Emergency deployment uses `bun repo ops emergency-deploy staging --dry-run` followed, only when deliberately authorized, by the same command with `--yes`; this bypasses ordinary qualification and records evidence. It does not migrate or seed databases.

## Evidence and documentation maintenance

- `.ci-evidence/qualification.json` records mandatory qualification outcomes and source identity.
- `.release/manifest.json` records commit, environment, tool/API identity, artifact hashes and status. Consumer evidence includes backend SHA and generated-client checksums.
- `.ci-evidence/reports/` contains sanitized JSON/CSV, masked browser captures and an HTML index. Integration clears its own previous report directories; private provisioning/session fixtures are excluded.
- Screenshot runs use ignored `apps/webapp/.screenshots/<run-id>/`. Curated gallery instructions live in the [design-system README](../../design-system/README.md#visual-review).

Evidence describes a run; it does not pin future releases or prove an unrelated revision. Never copy old successful results into a new qualification. Plans, audits and historical evidence are preserved externally, with source identity and outstanding items.

`bun repo generate commands` updates the marked command block below and `ops/commands.txt`; `bun repo check commands` detects drift while preserving surrounding prose. Edit command behavior in `ops/commands.ts`, then regenerate. Engineering documentation belongs in READMEs; `docs/` contains only the six normative specs.

## Complete command reference

<!-- repo-commands:start -->

```text
Usage: bun repo <command>

Frontend repository commands. Use <command> --help for details.

Commands:
  dev                      Start webapp and webadmin using the prepared API client. Enable local OTP capture controls by default; set PUBLIC_TEST_OTP_ACCESS=false to opt out.
  check                    Run all repository checks.
  test                     Run test suites.
  build                    Build webapp and webadmin release artifacts without deployment.
  generate                 Prepare clients, dependencies and generated assets.
  ops                      Run operational checks and emergency deployment.
  ci                       Run CI verification and release operations.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo <command> --help

Usage: bun repo dev

Start webapp and webadmin using the prepared API client. Enable local OTP capture controls by default; set PUBLIC_TEST_OTP_ACCESS=false to opt out.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo dev

Usage: bun repo check [command]

Run all repository checks.

Commands:
  doctor                   Check configuration and repository layout.
  commands                 Check generated command documentation.
  client                   Check the prepared and installed API client.
  brand                    Check brand assets, tokens and visual literals.
  architecture             Check frontend architecture.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo check

Usage: bun repo check doctor

Check configuration and repository layout.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo check doctor

Usage: bun repo check commands

Check generated command documentation.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo check commands

Usage: bun repo check client

Check the prepared and installed API client.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo check client

Usage: bun repo check brand

Check brand assets, tokens and visual literals.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo check brand

Usage: bun repo check architecture

Check frontend architecture.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo check architecture

Usage: bun repo test <command>

Run test suites.

Commands:
  unit                     Run workspace unit tests.
  tooling                  Run the complete tooling package test suite.
  integration              Run supervised integration suites.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo test <command> --help

Usage: bun repo test unit

Run workspace unit tests.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo test unit

Usage: bun repo test tooling

Run the complete tooling package test suite.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo test tooling

Usage: bun repo test integration

Run supervised integration suites.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo test integration

Usage: bun repo build <staging|production>

Build webapp and webadmin release artifacts without deployment.

Arguments:
  environment              Values: staging, production.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo build staging

Usage: bun repo generate <command>

Prepare clients, dependencies and generated assets.

Commands:
  client                   Prepare an API client from a backend revision or checkout.
  dependencies             Install and verify dependencies against the prepared client.
  setup                    Generate SvelteKit setup files for both applications.
  brand                    Generate brand CSS tokens.
  gallery                  Build the review gallery and manifest from existing screenshots.
  reviewed-brand-baseline  Record current assets and visual literals as the reviewed brand baseline.
  commands                 Regenerate the full command reference and saved help.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo generate <command> --help

Usage: bun repo generate client [staging|production] [options]

Prepare an API client from a backend revision or checkout.

Arguments:
  environment              Values: staging, production. Default: staging.

Options:
  -h, --help               Show help for this command.
  --ref <ref>
      Backend revision; mutually exclusive with --backend-root. Not allowed in CI.
  --backend-root <path>
      Existing backend checkout; mutually exclusive with --ref.

Examples:
  bun repo generate client staging
  bun repo generate client staging --backend-root ../edaya_backend

Usage: bun repo generate dependencies

Install and verify dependencies against the prepared client.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo generate dependencies

Usage: bun repo generate setup

Generate SvelteKit setup files for both applications.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo generate setup

Usage: bun repo generate brand

Generate brand CSS tokens.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo generate brand

Usage: bun repo generate gallery

Build the review gallery and manifest from existing screenshots.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo generate gallery

Usage: bun repo generate reviewed-brand-baseline

Record current assets and visual literals as the reviewed brand baseline.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo generate reviewed-brand-baseline

Usage: bun repo generate commands

Regenerate the full command reference and saved help.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo generate commands

Usage: bun repo ops <command>

Run operational checks and emergency deployment.

Commands:
  smoke                    Run HTTP smoke checks against staging frontend shells.
  emergency-deploy         Build and deploy through the emergency qualification bypass; does not migrate or seed.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo ops <command> --help

Usage: bun repo ops smoke <staging>

Run HTTP smoke checks against staging frontend shells.

Arguments:
  environment              Values: staging.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo ops smoke staging

Usage: bun repo ops emergency-deploy <staging|production> [options]

Build and deploy through the emergency qualification bypass; does not migrate or seed.

Arguments:
  environment              Values: staging, production.

Options:
  -h, --help               Show help for this command.
  --yes
      Explicitly confirm the operation.
  --dry-run
      Preview without applying remote changes.

Examples:
  bun repo ops emergency-deploy staging --dry-run
  bun repo ops emergency-deploy staging --yes

Usage: bun repo ci <command>

Run CI verification and release operations.

Commands:
  verify                   Run repository checks, workflow lint, tooling tests, quality, builds and unit tests.
  qualify                  Verify, integrate, build and qualify a release.
  deploy                   Deploy existing qualified release artifacts.
  workflows                Validate workflow definitions.
  setup                    Prepare CI tools and framework files where applicable.
  archive-inputs           Copy lockfile inputs into release evidence.
  browser-suites           Run browser suites against the configured services.
  client-key               Emit the backend/client cache key.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo ci <command> --help

Usage: bun repo ci verify

Run repository checks, workflow lint, tooling tests, quality, builds and unit tests.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo ci verify

Usage: bun repo ci qualify <staging|production>

Verify, integrate, build and qualify a release.

Arguments:
  environment              Values: staging, production.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo ci qualify staging

Usage: bun repo ci deploy <staging|production> [options]

Deploy existing qualified release artifacts.

Arguments:
  environment              Values: staging, production.

Options:
  -h, --help               Show help for this command.
  --dry-run
      Preview without applying remote changes.

Examples:
  bun repo ci deploy staging

Usage: bun repo ci workflows

Validate workflow definitions.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo ci workflows

Usage: bun repo ci setup

Prepare CI tools and framework files where applicable.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo ci setup

Usage: bun repo ci archive-inputs

Copy lockfile inputs into release evidence.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo ci archive-inputs

Usage: bun repo ci browser-suites

Run browser suites against the configured services.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo ci browser-suites

Usage: bun repo ci client-key <backend-path>

Emit the backend/client cache key.

Arguments:
  backend-path             Required value.

Options:
  -h, --help               Show help for this command.

Examples:
  bun repo ci client-key <backend-path>
```

<!-- repo-commands:end -->
