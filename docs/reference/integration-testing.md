# Integration coverage

Run against disposable local Identity, school, and file services. The CI startup script composes the real Identity application with captured OTP delivery, a controllable expiration clock, and an isolated account-policy fixture. Codes and recovery secrets must never be included in uploaded artifacts. Real provider delivery is outside this suite.

Public commands:

- `bun run test:integration:onboarding`: passwordless authentication, invitations, provisioning and owner MFA policy.
- `bun run test:integration:provisioned`: browser workflows on a newly provisioned school.
- `bun run test:integration:webadmin`: registered navigation and placeholder routes only.
- `bun run test:integration:coverage`: validate registration, successful executable outcomes and matching source fingerprints for all three suites.

`apps/webapp/tests/integration/features.json` records stable scenario and feature IDs. The route, sidebar and modal catalogs supply the current structural inventory. New production surfaces must be registered; removed or renamed scenarios must update the contract. A feature change must update the executable behavior assertions in the same PR. Reviewers must inspect those assertions: structural registration alone cannot establish meaningful behavior coverage.

Opening a form covers navigation only. Create, save, publish, delete and other mutation scenarios must exercise the operation and inspect its persisted result after reload. Required fixture failures and blocked dependent scenarios fail the run. Independent scenarios continue. Optional spreadsheet generation does not determine test success.

Execution artifacts include scenario outcomes and a source fingerprint. An interrupted run, missing scenario, failure, unexpected skip or result from older sources is rejected. Do not copy an earlier success summary into a new run. Finish editing before the final integration run and coverage validation.

Native platform behavior, real messaging-provider delivery, push delivery and future support-assisted recovery remain coverage limits. Webadmin business workflows are placeholders, not covered production workflows.
