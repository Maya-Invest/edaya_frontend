# Independent verification and releases

Each repository verifies and releases its own revision. Backend changes do not require synchronized consumer source changes, client package publication, or release manifests in sibling repositories. Cloudflare application deployments remain; no container publication is configured.

| Event | Required behavior |
| --- | --- |
| PR into `main` or `staging` | Full verification and integrations; no deployment |
| Other branch push | Repository checks and unit/tooling tests |
| Push to `staging` | Qualify that commit, release staging |
| Push to `main` | Qualify that commit, release production |
| Manual deployment | Select revision in the environment's deployment workflow; use the same qualification and deployment jobs |
| Manual validation | Select environment, revision, and optionally a backend reference; never deploy |

Deployments are serialized per repository/environment without cancelling active deployments. They depend on successful qualification; failure, cancellation or skipped qualification cannot deploy. Artifact restoration selects the unique qualified artifact from the same run and attempt, checks out its recorded source commit, restores frozen dependencies, and verifies file checksums. Deployment never resolves another backend branch or generates another client.

## Adoption gate

Replacement deployment jobs require repository variable `ENABLE_INDEPENDENT_RELEASES=true`. Leave it unset until full local verification, both destination builds, all integration suites, artifact handoff, and non-deploying GitHub rehearsals pass. The bootstrap API snapshot also needs review before the backend gate is enabled. No production release is implied by installing this tooling.

Deploy the backend tooling changes to the destination branches before consumers qualify against those branches: consumer integration uses the backend's typed fixture command. Configure branch protection to require **qualification / Full validation** from the PR workflow (confirm the exact displayed check name on the first rehearsal). Remove obsolete coordinator/publication checks only after that required check succeeds. GitHub may display the caller workflow name as an additional prefix.

Bun remains pinned to 1.3.14, Flutter to 3.44.8. Ubuntu CI and macOS development use native Git, Node.js 22+ for the third-party Wrangler CLI, archive tools and PostgreSQL binaries where needed. Validators are downloaded at pinned versions and verified against committed SHA-256 checksums. No first-party Python or Node operational runtime is required.

## Release evidence

`.ci-evidence/qualification.json` records source identity and mandatory outcomes. `.release/manifest.json` records source commit, environment, tool version, API fingerprint, artifact hashes and status. Consumer evidence includes backend commit and generated-client checksums. Evidence is an output; it does not pin another repository's future release. Private fixtures are disposable and logs are sanitized before they become retained evidence.

## Backend input

Production resolves backend `main`; staging resolves backend `staging`. Resolve once and detach at that SHA. A moving branch cannot change an existing checkout or generated client. The selected branch identifies the source tested, not necessarily the currently deployed backend.

Local preparation defaults to staging. `--ref <branch-or-commit>` is an explicit local override. `--backend-root <clean-checkout>` accepts an already resolved checkout. Ordinary CI selects only the destination branch; overrides are exposed by Manual validation. Integrations verify the backend checkout still equals the prepared client's commit and has no tracked edits before starting services.

`IDENTITY_CHECKOUT_TOKEN` needs read-only contents access to `Maya-Invest/edaya_backend`. It is used only for source checkout. Package-registry credentials and write permissions are no longer needed. Cache identities include backend SHA, generator/runtime inputs and relevant lockfiles; invalid checksum entries are rebuilt. Generated inputs are transferred with qualification artifacts and checked again before release.

## Frontend commands

```sh
bun run repo generate client staging
bun run repo generate dependencies
bun run repo generate setup
bun run repo check
bun run repo ci verify
bun run repo test integration
bun run repo build staging
```

Preparation builds the backend TypeScript client and copies the package into ignored `.generated/api-client`. Both apps install that same local package. `generate setup` creates Svelte's framework inputs before checks. Checks do not create local environment files or rewrite generated sources. Repeat acquisition explicitly when changing backend input, then install and freeze dependencies.

The integration supervisor starts the same backend commit and local file service in temporary storage. Availability, onboarding, provisioned, webadmin and demo browser suites are mandatory, including the owned feature coverage gates. QA matrices retain JSON/CSV and browser reports; QA Excel workbook generation has been removed. Generated CSV files stay inside this repository. CI collects sanitized reports and masked scenario screenshots under `.ci-evidence/reports/`, with an HTML index, and excludes private provisioning/session fixtures. Each supervised integration run clears its prior report directories before execution. Product spreadsheet imports/exports, onboarding templates and unrelated route inventories remain.

Environment secrets `CLOUDFLARE_API_TOKEN` and variable `CLOUDFLARE_ACCOUNT_ID` authorize deployment of webapp/webadmin. Deployment uploads their already built static directories without rebuilding. Emergency deployment is `bun repo ops emergency-deploy staging --dry-run`, then explicit `--yes`, with evidence and no database operations.

## Entrypoint migration inventory

| Previous entrypoints | Replacement or disposition |
| --- | --- |
| `scripts/brand-{tokens,check,gallery}.py` | `tooling/repo/ops/brand.ts` |
| `ci-start-local-apis.sh`, `ci-wait-for-url.sh`, `run-browser-integration.sh` | `integration.ts`, central service/process helpers, pinned backend fixture |
| `api-client-version.mjs`, `ci-use-published-api-client.mjs`, vendor package | Removed; `client.ts` source acquisition, local installation and freeze |
| `release-contract.py`, `ci_support.py`, Python workflow/evidence tests | Independent checksummed release/client evidence and Bun tests |
| Integration QA Excel generators and updater commands | Removed; JSON/CSV and browser reports retained |
| Workflow shell execution fragments | Typed CI commands; YAML retains events, permissions, dependencies and concurrency |

Wrangler remains a third-party Node CLI because its local emulator rejects Bun; all maintained frontend orchestration and its tests execute under Bun. Framework configuration files retain their native formats.

## Local migration rehearsal — 2026-10-11

A clean, isolated source snapshot passed the complete `ci qualify staging` command using one acquired backend commit throughout preparation, integrations and build. Repository/workflow checks, TypeScript analysis, application unit tests and all **38** tooling tests passed. Required browser results were availability **6/6**, onboarding **29/29**, provisioned **403/403**, webadmin **4/4**, and demo **119/119**. Messaging, family feedback, permission, timetable and required coverage checks also passed.

The qualified candidate was archived and restored into a second clean checkout through the actual restoration module, with locally simulated GitHub artifact responses. Frozen dependency installation, client checksums and all **590** release artifact checks passed. Modified and additional build files were rejected. This exercised local artifact transport and validation; it was not a GitHub-hosted rehearsal. The snapshot source commit was `f3b1a5d40e1d9319d48c694cf2a9ea6c6e3ae63f`, with backend input `914a5506e423a6d31ff78490b2dbe0aecde5049c`; neither identifies a deployed revision.

Both applications passed staging deployment dry runs from the restored artifacts and production build/deployment dry runs. Sanitized JSON/CSV reports, masked browser captures and their HTML index were retained. Nothing was published or deployed. GitHub-hosted qualification and artifact handoff, environment configuration and required branch-protection checks remain to be rehearsed before enabling the adoption gate.
