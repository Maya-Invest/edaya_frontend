# Repository commands


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

The integration supervisor starts the same backend commit and local file service in temporary storage. Availability, onboarding, provisioned, webadmin and demo browser suites are mandatory, including the owned feature coverage gates. QA matrices retain JSON/CSV and browser reports; QA Excel workbook generation has been removed. Product spreadsheet imports/exports, onboarding templates and unrelated route inventories remain.

Environment secrets `CLOUDFLARE_API_TOKEN` and variable `CLOUDFLARE_ACCOUNT_ID` authorize deployment of webapp/webadmin. Deployment uploads their already built static directories without rebuilding. Emergency deployment is `bun run repo maintenance emergency-deploy staging --dry-run`, then explicit `--yes`, with evidence and no database operations.

<!-- repo-commands:start -->

```text
Usage: bun run repo <command>

check         Repository hygiene and prepared client/brand integrity.
test          unit | integration | tooling
build         staging | production (no deployment)
generate      client [staging|production] [--ref REF | --backend-root PATH] | dependencies | setup | brand | gallery | commands | reviewed-brand-baseline
dev           Start webapp and webadmin.
maintenance   emergency-deploy <staging|production> [--yes] [--dry-run]
ci            verify | qualify <staging|production> | browser-suites | workflows | deploy <environment>
```

<!-- repo-commands:end -->
