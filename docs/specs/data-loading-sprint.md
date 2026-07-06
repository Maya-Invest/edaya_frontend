# Data Loading Sprint — Alignment Tracker

> **Normative contract:** [data-loading-spec.md](./data-loading-spec.md)  
> **Execution:** [demo-ready-plan.md](../sprints/demo-ready-plan.md)

This document tracks **codebase alignment** with the data-loading spec. It is not normative — when code and spec disagree, update code to match the spec (or amend the spec in a dedicated PR).

---

## Status legend

| Tag | Meaning |
|-----|---------|
| ✅ | Matches spec |
| ⚠️ | Partial — works but has known drift |
| ❌ | Not aligned |

---

## Shell bootstrap

| Item | Status | Notes |
|------|--------|-------|
| `getAppShellData` → `academicContext.initFromShell` | ✅ | Schools, years, periods, classes, nav counts |
| No module entity collections at bootstrap | ⚠️ | Audit remaining `+layout` fetches periodically |
| `refresh: true` only for structural academic changes | ✅ | Documented in mutations |

---

## Route queries (`lib/queries/`)

| Route | `query*Page` | Seeds entity store | Status |
|-------|--------------|-------------------|--------|
| `/school/students` | `querySchoolStudentsPage` | Students (paginated) | ✅ |
| `/school/guardians` | `querySchoolGuardiansPage` | Guardians (paginated) | ✅ |
| `/school/staff` | `querySchoolStaffPage` | Permission catalog + subjects for scope builder | ✅ |
| `/classes/:id/students` | `queryClassStudentsPage` | Class student slice | ✅ |
| `/classes/:id/timetable` | planning query | Planning events + class students | ⚠️ |
| `/classes/:id/evaluations` | evaluations query | Assessments class slice | ⚠️ |
| `/configuration/roles` | — | **Removed** — delete route per v1 spec | ❌ legacy route still in tree |

**Rule:** Lists render from `detailDataContext` / entity store, not from raw `PageQuery` return values after seed.

---

## Entity store (`detail-data/context.svelte.ts`)

| Collection | Seed / patch | Status |
|------------|--------------|--------|
| Students, guardians, staff | Merge by `id` | ✅ |
| `staffPermissionAssignments` | Merge; views via `buildStaffPermissionAssignmentViews` | ✅ |
| `permissionCatalog` | Replace on staff page load | ✅ |
| Planning / assessments | Replace class slice | ⚠️ verify per route |
| Report cards | Domain store (`report-cards/context`) | ✅ |
| Teaching log | Domain store | ✅ |

---

## Mutations (`lib/api/mutations/`)

| Rule | Status | Notes |
|------|--------|-------|
| `runMutation` with `apply` + `rollback` | ⚠️ | New mutations follow spec; audit legacy callers |
| No `refresh: true` for record edits | ⚠️ | Grep for stray shell refresh |
| Toasts on success/error | ✅ | Via `runMutation` |

---

## Testing

| Area | Status | Location |
|------|--------|----------|
| Route loading contracts | ✅ | `*.loading.test.ts`, `class-route-loading.test.ts` |
| `schoolWideEntityList` for unscoped reads | ✅ | `entity-list-filters.ts` |
| Mutation apply/rollback | ⚠️ | Add when touching mutation modules |
| `parseDetailPath` + missing id | ⚠️ | Extend `scope-ids.test.ts` pattern |

---

## Cleanup backlog (data-loading)

- [ ] Remove `/configuration/roles` query + any `access-roles` data modules
- [ ] Ensure homework route data migrates to evaluations query only
- [ ] Add `queryGradeLevelsPage` when grade-levels route lands (Phase 1)
- [ ] Daily attendance route: `queryClassAttendancePage` seeds `attendances` slice (Phase 4)
- [ ] Audit components that `$effect`-fetch instead of route query

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-03 | Initial alignment tracker (referenced from data-loading-spec) |
