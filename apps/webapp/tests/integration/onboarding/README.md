# Onboarding integration coverage

Run `bun run test:integration:onboarding` from a disposable, supervised API/Identity fixture with `WEBAPP_URL` and the fixture's API/OTP environment. The repository's `bun repo test integration` owns these services for the full qualification suite. Do not run provisioning scenarios against an existing school database.

- `wizard-interactions`: canonical loading, read-only subject inspection by keyboard, exact grading labels, Review reload, FR/EN mobile overflow, unavailable pinned-version recovery, and multiple dataset selection clearing only structural settings.
- `owner-resume`: session resume and v7 Review migration with empty obsolete mappings, provisioning and committed reload.
- `school-period-dates`: horizontal semester/trimester radios, fixed period counts with no add/remove controls, automatic full-calendar population, keyboard selection, editable dates and footer clearance.
- `provision-double-submit` and the shared provisioning helper: repeated activation with a pinned reference; mappings and browser snapshots must be absent.
- `provision-bootstrap-retry`: committed provisioning recovers a failed bootstrap without another school creation.

Dataset selector scenarios intercept only read endpoints to expose an additional test choice; actual provisioning journeys use the published CI dataset and the real API. Pure loader tests cover country defaults, unsupported countries, stale responses, teardown and version mismatch; service/API integrations verify persisted catalog, modules and grading.

When an uncertain request is found committed after the local draft changed, its original effective payload restores Review before replay/bootstrap; later local invitations or curriculum choices must not be presented as already provisioned.
