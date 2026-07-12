# Route State Migration

> **Lifecycle:** on-going  
> **Normative spec:** [`docs/specs/route-state-spec.md`](../../specs/route-state-spec.md)  
> **Reference route:** `/school/students`

---

## 1. Goal

Replace the legacy **global entity store + central drawer** with **route-scoped state**:

| Legacy (remove) | Target (keep / add) |
|-----------------|---------------------|
| `detailDataContext` seeds | `*-page.svelte.ts` owns list + selection |
| `sessionDetailContext`, `teachingLogContext`, … | Tab-local `*-tab.svelte.ts` slices |
| Global `DetailDrawer` + `?tab=` | Local drawer + nested tab **routes** |
| Fetch in component `$effect` | `PageQuery` on route / tab `+page.svelte` |
| Mutations patch global store | Mutations on route / tab state + `entityVersions.bump` |

**Gate:** legacy deletion (§6) opens only when **every route** and **smart component** in the inventory is **✅ Full** on all applicable pattern checks.

**Foundation (done):** `lib/entity-versions.svelte.ts`, `lib/navigation/invalidate-on-navigate.ts`.

---

## 2. Pattern checks

Each migrated unit is scored against these columns. Use **—** when the column does not apply (e.g. no drawer, no tabs).

| Col | Check | Pass criteria |
|-----|-------|----------------|
| **RS** | Route state | `*-page.svelte.ts`, `set*` / `get*` from layout, list via `PageQuery` |
| **NC** | No global context | Zero `detailDataContext` / `sessionDetailContext` / domain globals in route subtree |
| **TR** | Tab routes | Each drawer tab is a child route under `[id]/` or `[[id]]/` — not `?tab=` |
| **TL** | Lazy tabs | Non-profile tabs: `*-tab.svelte.ts` + `PageQuery` on tab `+page.svelte`; data loads on tab visit |
| **LD** | Local drawer | Route-owned drawer layout; listed in `usesRouteLocalDrawer()` |
| **VI** | Version invalidation | `RouteVersionSnapshot` + `invalidateIfStale()` for entity families in the slice |
| **CO** | Colocated | Queries, mutations, helpers under `routes/.../lib/`; UI under `routes/.../components/` |

### Status values

| Status | Meaning |
|--------|---------|
| **✅ Full** | All **applicable** checks pass |
| **⚠️ Partial** | Route works on new architecture but one or more checks still open (see Notes) |
| **🔄** | Migration in progress |
| **⬜** | Not started |

---

## 3. Progress dashboard

| Area | Total | ✅ Full | ⚠️ Partial | ⬜ |
|------|-------|---------|------------|-----|
| Routes | 30 | 10 | 0 | 20 |
| Smart components | 6 | 0 | 0 | 6 |
| Foundation | 3 | 3 | — | — |

**Next legacy-deletion blocker:** 20 routes + 6 smart components still ⬜.

---

## 4. Route inventory

### 4.1 Migrated routes — pattern matrix

Primary tracker. **Notes** hold the remaining gap for ⚠️ rows.

| Route | RS | NC | TR | TL | LD | VI | CO | Status | Notes |
|-------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:------:|-------|
| `/school/students` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅ Full** | Reference implementation |
| `/school/guardians` | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | **✅ Full** | No tabs (sections on one page) |
| `/school/staff` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅ Full** | Profile = main entity; permissions + assignments lazy |
| `/school/teachers` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅ Full** | Assignment counts sync from assignments tab visit |
| `/school/calendar` | ✅ | ✅ | — | — | — | ✅ | ✅ | **✅ Full** | No drawer; `schoolYearEvents` version + route mutations |
| `/school/activities` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅ Full** | Profile = main entity; students + classes tabs lazy |
| `/school/announcements` | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | **✅ Full** | Profile = main entity on list row; local drawer |
| `/school/events` | ✅ | ✅ | — | — | ✅ | ✅ | ✅ | **✅ Full** | Local drawer; detail loads involvements/sanctions on open |
| `/classes/:id/timetable` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅ Full** | `TimetablePlanningView` colocated under route components |
| `/classes/:id/evaluations` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅ Full** | `details` + `grading` tab routes; grading lazy-loads students/results |
| `/classes/:id/students` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | **⬜** | |
| `/classes/:id/teaching` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | **⬜** | `?tab=` today |
| `/classes/:id/report-cards` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | **⬜** | |
| `/classes/:id/attendance` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | **⬜** | |
| `/finance/*` (3) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | **⬜** | fees, billing, payment |
| `/configuration/*` (10) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | **⬜** | class/subject drawers use `?tab=` |
| `/dashboard`, `/account/*` (3) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | **⬜** | |

<details>
<summary><strong>Tab routes target</strong> (drawer routes only)</summary>

| Route | Tab segments |
|-------|----------------|
| `/school/students` | `profile`, `grades`, `attendance`, `incidents`, `finances`, `report-card`, `enrollments` |
| `/school/staff` | `profile`, `permissions`, `assignments` |
| `/school/teachers` | `profile`, `assignments`, `availability` |
| `/school/activities` | `profile`, `students`, `classes` |
| `/classes/:id/timetable` | `details`, `attendance`, `logbook` |
| `/classes/:id/evaluations` | `details`, `grading` |
| `/configuration/classes` | `profile`, `assignments` (not migrated) |
| `/configuration/subjects` | `progression`, `logbook` (not migrated) |
| `/classes/:id/teaching` | `progression`, `logbook` (not migrated) |

</details>

<details>
<summary><strong>Entity version keys</strong> (for VI column)</summary>

| Route | `entityVersions` families |
|-------|-------------------------|
| students, guardians, staff, teachers | `students` / `guardians` / `staff` / `teachers` |
| activities | `activities` |
| announcements | `announcements` |
| timetable | `planning`, `teacherUnavailabilities` |
| evaluations | `evaluations` |
| calendar | `schoolYearEvents` |

</details>

### 4.2 Smart components

| Component | RS | NC | Own fetch | Status |
|-----------|:--:|:--:|:---------:|:------:|
| PersonPicker | ⬜ | ⬜ | ⬜ | **⬜** |
| StudentPicker | ⬜ | ⬜ | ⬜ | **⬜** |
| StaffPicker | ⬜ | ⬜ | ⬜ | **⬜** |
| GuardianPicker | ⬜ | ⬜ | ⬜ | **⬜** |
| ScopeBuilder | ⬜ | ⬜ | ⬜ | **⬜** |
| StaffPermissionFormModal | ⬜ | ⬜ | ⬜ | **⬜** |

Target: `lib/smart-components/{name}/` with `*-state.svelte.ts`. Pickers must not read `detailDataContext`.

---

## 5. Reference implementation

**Canonical route:** `routes/(app)/school/students/`  
Copy this shape for every list + drawer feature.

### 5.1 File layout

```
routes/(app)/school/students/
  +layout.svelte                    # setStudentsPageState, list PageQuery, StudentsList
  students-page.svelte.ts           # list state, selection, mutations, invalidateIfStale
  lib/                              # queries, mutations, filters, tab helpers
  components/                       # list, modals
  [[id]]/
    +layout.svelte                  # local drawer, register + clear tab states
    +page.ts                        # redirect bare id → default tab
    student-detail-states.svelte.ts # wires tab state instances
    components/                     # drawer chrome, tab bar, header
    (tabs)/
      profile/
        +page.svelte                # PageQuery (supplementary data beyond list row)
        student-profile-tab.svelte.ts
        components/StudentProfileTab.svelte
      grades/
        +page.svelte                # PageQuery + DataState
        student-grades-tab.svelte.ts
        components/StudentGradesTab.svelte
      …                             # one folder per tab
```

**Class timetable** uses `[id]/` (required segment) instead of `[[id]]/` because list URL is `/timetable` sibling — see §5.3.

### 5.2 Tab lazy-load contract

Applies to every drawer tab that needs more than the **main entity** already on the list row.

```
[id]/+layout.svelte
  └─ createAndRegister*DetailStates()   # register tab states; clear on drawer close

(tabs)/<tab>/+page.svelte
  └─ PageQuery(tabState.query())
       └─ DataState
            └─ <TabComponent />        # reads tab state only — no $effect fetch

(tabs)/<tab>/*-tab.svelte.ts
  └─ slice = $state(...)
  └─ query() → load on tab navigation
  └─ mutation helpers with apply / rollback
```

**Profile tab rule:** if the tab only shows fields from the list entity, no tab state / `PageQuery` required. If it loads extra data (student 360, health, notes), use tab state + `PageQuery` like other tabs.

### 5.3 Drawer segment: `[id]` vs `[[id]]`

| Pattern | When | Example |
|---------|------|---------|
| `[[id]]/` | Drawer id is optional segment; bare `/entity/:id` redirects to default tab | `/school/students/abc` → `…/profile` |
| `[id]/` | List URL is sibling without id; drawer always has id | `/classes/x/timetable` + `/classes/x/timetable/session-1/details` |

Optional `[[id]]` before fixed tab paths can break `appPath` (timetable once resolved to `/timetable//attendance`).

### 5.4 Local drawer registration

Add pathname regex to `usesRouteLocalDrawer()` in `(app)/+layout.svelte` so the global `DetailDrawer` does not open.

Currently registered: students, guardians, staff, teachers, activities, announcements, events, class evaluations, class timetable.

---

## 6. Migration playbook

Per route (repeat until **✅ Full**):

1. Add `*-page.svelte.ts` + `set*` / `get*` from list `+layout.svelte`.
2. Colocate `lib/*.ts` and `components/`; remove `detailDataContext.seed*` from queries.
3. Add `[[id]]/` or `[id]/` with local drawer `+layout.svelte` and tab bar linking to tab routes.
4. For each data tab: `*-tab.svelte.ts`, tab `+page.svelte` with `PageQuery` + `drawerTabRouteCacheKey`.
5. Register tab states in drawer `+layout.svelte`; `clear*` on close.
6. Move mutations into page / tab state; `entityVersions.bump` on success.
7. Wire `RouteVersionSnapshot` + `registerVersionInvalidation` for slice families.
8. Update route tests; set matrix row to **✅ Full** or document **⚠️** gap in Notes.

Tab URL: `?tab=grades` → `/grades` (no compatibility redirect required for v1).

---

## 7. Legacy deletion gate

**Do not delete until every §4 row is ✅ Full.**

| Remove | Why |
|--------|-----|
| `lib/detail-data/context.svelte.ts` | Global entity store |
| `lib/detail-routes.ts`, `lib/drawer/drawer-detail-hydration.ts` | Central drawer resolution |
| `lib/drawer/drawer-tabs-state.svelte.ts`, `drawer-tab-url.ts` | `?tab=` machinery |
| `lib/session-detail/context.svelte.ts` | Replaced by timetable tab states (when `PlanningDetail` gone) |
| `lib/teaching-log/context.svelte.ts`, `lib/report-cards/context.svelte.ts` | Folded into route state |
| `lib/components/school/{domain}/` feature views | Colocated under routes |
| Global `DetailDrawer` dispatch in `(app)/+layout.svelte` | Each route owns drawer |

Keep: `lib/components/school/shared/` (T2 chrome), `lib/api/mutations/` (slimmed — no global patches).

---

## 8. Suggested order

1. ~~Foundation~~ ✅  
2. ~~School people + school life (partial)~~ — finish events (done); remaining school-life routes TBD  
3. ~~Class timetable, evaluations (partial)~~ — finish tab routes on evaluations; colocate timetable calendar  
4. Smart pickers (unblock forms)  
5. Remaining class routes + `class-layout.svelte.ts`  
6. Finance → configuration → account  
7. Legacy deletion (§7)

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-12 | `/school/events` migrated — local drawer, route state, colocated components |
| 2026-07-12 | `/school/announcements` migrated — local drawer, route state, colocated components |
| 2026-07-12 | Restructured doc: goal, pattern matrix, reference §5, progress dashboard; scored migrated routes against RS/NC/TR/TL/LD/VI/CO |
| 2026-07-12 | Tab lazy-load alignment: timetable, calendar, staff, teachers, activities |
| 2026-07-12 | `/classes/:id/timetable` migrated — local drawer, `[id]/(tabs)/` |
| 2026-07-10 | `/school/students` reference slice; staff, guardians, teachers, evaluations |
| 2026-07-10 | Initial tracker |
