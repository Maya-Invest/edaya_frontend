# Plans (sprints)

Implementation proposals and trackers. **Not normative for agents** — see `docs/specs/` and `AGENTS.md`.

## Lifecycle

| Stage | Location convention | Purpose |
|-------|---------------------|---------|
| **planned** | `docs/sprints/` | Scoped proposal, not yet executing |
| **on-going** | `docs/sprints/` | Active checkboxes and execution notes |
| **done** | `docs/sprints/` or `archive/` | Delivered; tracker frozen |
| **archived** | `docs/sprints/archive/` | Historical context only |

When archiving, extract unchecked items into a new on-going plan rather than leaving stale checkboxes in archived files.

## Current layout

| Path | Role |
|------|------|
| `on-going/webapp-api-drift-plan.md` | On-going — close webapp ↔ core API/domain command & UI gaps |
| `on-going/route-state-migration.md` | Route-state migration matrix (complete) |
| `on-going/teacher-unavailability-timetable-generation-plan.md` | Timetable generation / tools |
| `archive/` | Completed plans (v1 shell, backend alignment, state migration, demo-ready, etc.) |
| `web-scripts-ci-alignment-plan.md` | On-going — align scripts & CI with edaya_backend |
| `student-import-plan.md` | Student import |

Human reference catalogs (feature cards, demo accounts, cross-repo workflow) live in `docs/reference/` — separate from plans and specs.
