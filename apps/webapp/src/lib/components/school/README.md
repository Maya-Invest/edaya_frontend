# School UI components

Domain-oriented folders under `components/school/`. Migrated routes colocate feature UI under `routes/(app)/…/components/`.

| Folder | Scope |
|--------|--------|
| `shared/` | Drawer chrome, `drawer-types`, `drawer-constants`, person pickers (re-exports → `lib/smart-components/`) |
| `scheduling/` | Timetable planning, session modals, generation UI (shared by class + school routes) |
| `dashboard/` | `DirectorDashboardView` |
| `academics/` | Shared subject modals/sections still used by teaching + config subject tabs |
| `configuration/` | Import modal stack, permission checkbox group, report-card section tree |
| `students/` | `StudentGradeEntryModal` |

Cross-domain imports should stay rare. Prefer lifting shared pieces into `shared/` when two domains need the same UI primitive.
