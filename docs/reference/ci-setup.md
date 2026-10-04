# CI setup

Branch pushes run repository hygiene, unit/tooling tests and applicable builds. Every pull request, including PRs targeting development branches, runs complete integration qualification. Production release jobs and the staging coordinator require qualification before publication or live changes. Git hooks are unchanged.

## Required checks

`verify / verify` is the unit check. `Full validation` requires successful verification and integration jobs, plus backend resolution for consumers. Failed, cancelled, missing or skipped required jobs fail this check. Manual PR dispatch runs the same full gates; test-skipping switches have been removed.

Ordinary staging pushes run unit checks. Staging release/validation is dispatched only through the backend **Full-stack staging release** coordinator. `validate_only=true` qualifies the three commits, performs dry runs and checks signed APKs without publishing, deploying or changing live data. Manifest schema 4 and APK provenance schema 3 remain unchanged.

## Backend revision and client contracts

Frontend/mobile resolve one immutable backend SHA before integration jobs. An explicit `backend_ref` wins; otherwise a matching consumer head branch is preferred, followed by the PR target branch when the matching branch is absent. Access failures do not fall back. Manual dispatch without a matching branch must supply `backend_ref`.

The retained secret `IDENTITY_CHECKOUT_TOKEN` needs contents:read access to the private backend repository; the staging coordinator additionally needs web/mobile checkout access. Checkout credentials are not persisted. Consumer and backend release contracts must match, and the backend's generated artifacts and content-addressed source fingerprint must pass verification before fixture startup. Every mobile matrix job receives the same resolved SHA.

Frontend unit/browser checks install the committed vendored API client with the frozen lockfile. They do not require a branch client to be published first. Production deployment uses `0.0.0-production.<qualified-backend-sha>` and checks the package's `edayaSourceCommit` and installed contract hashes. Missing or mismatched publication blocks deployment. Feature pushes never publish API clients.

Browser qualification executes TypeScript through pinned Bun 1.3.14. It does not fetch an untracked `tsx@latest` runner. Source freshness includes the application script manifests, committed lock, CI helpers and backend candidate.

## Toolchains and evidence

Jobs use Ubuntu 24.04, Node 22, Python 3.13, Bun 1.3.14, Flutter 3.44.8, Melos 8.0.0 and Java 17 where applicable. Actions are pinned to reviewed release commits with version comments. Dependency installations enforce committed locks. Workflow definitions are checked with actionlint 1.7.12, downloaded only after matching the pinned archive checksum; shell syntax is also checked.

Browser and mobile artifacts contain only `.ci-evidence/results.json`: revision, backend SHA, lock hash, fixed suite names, completion metadata and numeric counts. Fixture files, private sessions, OTP captures, screenshots and browser traces stay out of uploads. Failures still produce sanitized evidence. Staging uploads use a separate explicit file allowlist, including early configuration-preflight failures.

Local evidence and GitHub results are distinct. A local green run does not establish GitHub success for a newer revision. GitHub's current plan rejects private-repository branch protection/ruleset checks; deployment/publication dependencies are enforced by workflows, while protected merge enforcement remains unavailable/unverified. No billing or visibility changes are made.

## Browser qualification

`bun run verify` includes CI publication-helper tests and all application/tooling unit tests. `bash .github/scripts/run-browser-integration.sh` owns a disposable unified API and file service, runs availability, onboarding, provisioned, webadmin and development demo suites, then requires complete fresh execution of all five. Demo profiles are seeded only into this disposable fixture. The runner stops only its owned processes and removes captured credentials on exit.

The browser cache and installer both use `apps/webapp/.cache/ms-playwright`. Test OTP access is enabled only for local fixture builds. Staging/production builds omit it.

Run the complete local gate:

```sh
bun install --frozen-lockfile
bun run verify
bash .github/scripts/run-browser-integration.sh
```

The backend must be checked out as the sibling `edaya_backend` with matching release contracts. Production webapp/webadmin deployment requires both browser qualification and the exact qualified published client. Frontend staging dispatch fails with instructions to use the backend coordinator.
