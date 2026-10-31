# Onboarding wizard

`OnboardingWizardState` owns canonical dataset queries through `lib/dataset-loader.ts`. Structure and Review share the same resolved catalog; components never fetch curriculum. Dataset types come from the generated API schema. The four steps collect school/calendar, class structure, invitations, then review.

The list endpoint supplies country availability, labels and defaults. Retrieval always uses an exact ID/version. A generation counter and AbortController discard responses after selection changes or teardown. An unavailable pinned version is retryable and requires an explicit selection to replace it. Dataset changes do not alter calendar edits.

Draft version 8 stores `structure.dataset`, `templates` and class settings. Legacy model/level conversions live only in draft migration. Keep those conversions and legacy fingerprint normalization while supported saved drafts can contain version 7 payloads; the current wizard never reads the legacy template-list endpoint. No discipline mapping or other curriculum edit belongs in a browser draft or provisioning payload. Review counts subjects once per configured level, groups by report module and retains exact grading labels.

Provision retries normalize legacy fingerprints to the effective canonical payload. Equivalent requests retain both IDs. Changed uncertain requests refresh server membership before replacement; the school ID is retained even if a late original request commits. Committed attempts recover bootstrap without provisioning another school.

Run focused tests from `apps/webapp`: `bun test tests/lib/onboarding`, then `bun run check`. Browser coverage uses the owned backend fixture and onboarding scenarios (wizard interactions, owner resume, period dates, provisioning retry and happy path). Do not use production data for these runs. Prepare the generated client from an isolated clean backend revision using the root repository commands before verification.
