# Shared school UI components

Feature implementations live with their owning routes. This directory contains UI reused across routes:

| Folder | Scope |
|--------|-------|
| `shared/` | Drawer chrome, avatars, profile photo controls, and shared display constants |
| `academics/` | Subject editors and sections used by teaching and Configuration subjects |
| `documents/` | Reusable document issuance/download controls |
| `report-cards/` | Section comments shared by class and student report-card views |

Shared presentation receives typed action callbacks from its owner. Account linking, pickers and permission workflows own their I/O under `lib/smart-components/`. Reusable calendar/date helpers live in `lib/scheduling/`.

Dashboard, import, timetable, class permission, report-card definition and onboarding implementations belong to their route subtrees. Do not add forwarding components here.
