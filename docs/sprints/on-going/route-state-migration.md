# Route State Migration

> **Lifecycle:** on-going  
> **Normative target:** `docs/specs/route-state-spec.md`  
> **Strategy:** Migrate **routes** (page + tab child routes) and **smart components** (pickers, scope UI) one unit at a time until each matches the spec. Then delete all legacy implementation.

This plan defines **how** we get to the route-state architecture. The spec defines **what** the end state looks like.

---

## Approach

1. **List** every route surface and smart component (below).
2. **Migrate** each unit to match `route-state-spec.md` — route state class, colocated components, `PageQuery` seeds state, mutations on state + version bump.
3. **Gate** legacy deletion until **every** route and smart component is ✅.
4. **Delete** global entity store, central drawer routing, `?tab=` machinery, and `lib/components/school/{domain}/` feature views.

**New shared primitive (only major addition):** `lib/entity-versions.svelte.ts` + `invalidateIfStale()` wiring on route state. Everything else reuses existing `PageQuery`, `DataState`, `runMutation`, T0/T2 UI.

---

## Status legend

| Tag | Meaning |
|-----|---------|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Matches `route-state-spec.md` |
| — | N/A (no entity state / thin surface) |

---

## Phase 0 — Foundation (blocking)

- [x] `lib/entity-versions.svelte.ts` — `EntityVersionKey` union, `bump()`, session singleton
- [x] `lib/navigation/invalidate-on-navigate.ts` — call `state.invalidateIfStale()` on `afterNavigate`
- [x] Document **reference slice** in sprint notes once first route is ✅ (expected: `/school/students`)

---

## Per-unit definition of done

A route or smart component is ✅ when **all** apply:

- [ ] `*-page.svelte.ts` (or `*-picker-state.svelte.ts`) owns data / orchestration
- [ ] `set*` / `get*` context wired from layout or root component
- [ ] `PageQuery` / self-fetch seeds state — no `detailDataContext.seed*`
- [ ] Views read state — no fetch in component `$effect`
- [ ] Mutations on state class — `runMutation` + `entityVersions.bump` on success
- [ ] Components colocated: `routes/.../components/` or `lib/smart-components/...`
- [ ] Drawer tabs (if any) are nested routes under `[[id]]/` — not `?tab=`
- [ ] Loading tests updated or added for the unit
- [ ] No new imports of `detailDataContext` in the migrated subtree

---

## A — Routes

### A.1 School — people

| Route | Legacy view | Drawer | Tab routes (target) | `entityVersions` key | Status |
|-------|-------------|--------|---------------------|----------------------|--------|
| `/school/students` | `SchoolStudentsView` | Yes | `profile` (default), `grades`, `attendance`, `incidents`, `finances`, `report-card`, `enrollments` | `students` | ✅ |
| `/school/guardians` | `GuardiansView` | Yes | — (sections only) | `guardians` | ⬜ |
| `/school/staff` | `StaffView` | Yes | `profile`, `permissions`, `assignments` | `staff` | ⬜ |
| `/school/teachers` | `TeachersView` | Yes | `profile`, `assignments` | `teachers` | ⬜ |

**Notes**

- `/school/students` is the **reference slice** — see file tree below. Class route `/classes/:id/students` still uses legacy `StudentTabs` in `lib/` until that unit migrates.

**Reference slice file tree (`/school/students`)**

```
routes/(app)/school/students/
  +layout.svelte                 # StudentsPageState, list PageQuery, StudentsList
  students-page.svelte.ts        # list + detail slice + mutations
  students.queries.ts            # list query
  students-detail.queries.ts     # one PageQuery per drawer tab
  students-mutations.ts          # runMutation apply/rollback on route state
  student-detail-tabs.ts         # tab keys + active segment helper
  student-detail-types.ts        # StudentDetailSlice
  student-detail-selectors.ts    # tab derived data helpers
  components/                    # colocated list, drawer, tabs, modals
  [[id]]/
    +layout.svelte               # drawer shell + ensureSelectedStudent
    +page.svelte                 # profile tab
    grades/+page.svelte
    attendance/+page.svelte
    incidents/+page.svelte
    finances/+page.svelte
    report-card/+page.svelte
    enrollments/+page.svelte
```

### A.2 School — school life

| Route | Legacy view | Drawer | Tab routes | `entityVersions` key | Status |
|-------|-------------|--------|------------|----------------------|--------|
| `/school/calendar` | `SchoolCalendarView` | Thin | — | `schoolYearEvents` | ⬜ |
| `/school/activities` | `ActivitiesView` | Yes | — | `activities` | ⬜ |
| `/school/announcements` | `AnnouncementsView` | Yes | — | `announcements` | ⬜ |
| `/school/events` | `SchoolEventsView` | Yes | — | `incidents` | ⬜ |

### A.3 Classes (class layout state)

Parent layout: `routes/(app)/classes/[classId]/` — introduce `class-layout.svelte.ts` shared by child routes.

| Route | Legacy view | Drawer | Tab routes | `entityVersions` key | Status |
|-------|-------------|--------|------------|----------------------|--------|
| `/classes/:id/students` | `StudentsView` | Yes (student) | Reuse student tab routes or class-scoped drawer | `students` | ⬜ |
| `/classes/:id/timetable` | `PlanningView` | Yes | `details`, `attendance`, `logbook` | `planning` | ⬜ |
| `/classes/:id/teaching` | `TeachingLogView` | Yes | `progression`, `logbook` (subject drawer) | `subjects` | ⬜ |
| `/classes/:id/evaluations` | `EvaluationsView` | Yes | — (sections by `kind`) | `evaluations` | ⬜ |
| `/classes/:id/report-cards` | `ClassReportCardsView` | Yes | — | `reportCards` | ⬜ |
| `/classes/:id/attendance` | `AttendanceView` | Yes (day) | — | `attendance` | ⬜ |

**Notes**

- Timetable drawer: `PlanningDetail.svelte` + `?tab=` → three child routes.
- Teaching drawer: `SubjectTabs.svelte` + `?tab=` → two child routes.
- `teachingLogContext` / `reportCardsContext` fold into route or class layout state when these routes migrate.

### A.4 Finance

| Route | Legacy view | Drawer | Tab routes | `entityVersions` key | Status |
|-------|-------------|--------|------------|----------------------|--------|
| `/finance/fees` | `FeesView` | No (simple) | — | `fees` | ⬜ |
| `/finance/billing` | `FinanceView` | Yes | — | `billing` | ⬜ |
| `/finance/payment` | `PaymentsView` | No (simple) | — | `payments` | ⬜ |

### A.5 Configuration

| Route | Legacy view | Drawer | Tab routes | `entityVersions` key | Status |
|-------|-------------|--------|------------|----------------------|--------|
| `/configuration/school` | `SchoolSettingsView` | Layout variant | — | — (shell refresh) | ⬜ |
| `/configuration/academic` | `AcademicAdminView` | Accordion | — | — (shell) | ⬜ |
| `/configuration/grade-levels` | `GradeLevelsView` | Yes | — | — (shell-backed) | ⬜ |
| `/configuration/classes` | `ClassGroupsView` | Yes | `profile`, `assignments` | — (shell-backed) | ⬜ |
| `/configuration/subjects` | `ConfigSubjectsView` | Yes | `progression`, `logbook` | `subjects` | ⬜ |
| `/configuration/subjects/level/:level` | `ConfigSubjectsView` | Level group | — | `subjects` | ⬜ |
| `/configuration/report-cards` | `ReportCardDefinitionsView` | Yes | — | `reportCardDefinitions` | ⬜ |
| `/configuration/grade-scales` | `GradeScalesView` | No (simple) | — | `gradeScales` | ⬜ |
| `/configuration/notifications` | `NotificationTemplatesView` | No (simple) | — | `notificationTemplates` | ⬜ |
| `/configuration/discipline` | `DisciplinaryCatalogView` | No (simple) | — | `disciplinaryActions` | ⬜ |

**Notes**

- Class group drawer: `ClassGroupDetail.svelte` + `?tab=` → two child routes.
- Config subject drawer: `SubjectTabs.svelte` + `?tab=` → two child routes.

### A.6 Account & dashboard

| Route | Legacy view | Drawer | Tab routes | `entityVersions` key | Status |
|-------|-------------|--------|------------|----------------------|--------|
| `/dashboard` | `DirectorDashboardView` | Layout variant | — | — | ⬜ |
| `/account/inbox` | `NotificationsInboxView` | Thin | — | `inbox` | ⬜ |
| `/account/notifications` | (settings) | — | — | — | ⬜ |

---

## B — Smart components

Self-contained shared features — not route-bound. Target: `lib/smart-components/{name}/` with `*-state.svelte.ts` + root `.svelte` + `components/`.

| Component | Legacy path | Own fetch | `entityVersions` | Status |
|-----------|-------------|-----------|------------------|--------|
| **PersonPicker** | `school/shared/pickers/PersonPicker.svelte` | Yes (items from props or API) | — | ⬜ |
| **StudentPicker** | `school/shared/pickers/StudentPicker.svelte` | Yes | `students` (optional invalidate) | ⬜ |
| **StaffPicker** | `school/shared/pickers/StaffPicker.svelte` | Yes | `staff` | ⬜ |
| **GuardianPicker** | `school/shared/pickers/GuardianPicker.svelte` | Yes | `guardians` | ⬜ |
| **ScopeBuilder** | `school/configuration/ScopeBuilder.svelte` + `scope-builder-state.svelte.ts` | Uses catalog API | — | ⬜ |
| **StaffPermissionFormModal** | `school/configuration/StaffPermissionFormModal.svelte` | Modal + ScopeBuilder | `staffPermissionAssignments` | ⬜ |

**Notes**

- Pickers today read `detailDataContext` for items — migrate to self-fetch on open/search.
- `ScopeBuilder` / `scope-builder-state.svelte.ts` already partial smart-component shape; move under `lib/smart-components/`.
- T0 modals (`FormModal`, `ConfirmModal`, `PickerModal`) stay in `lib/components/ui/` — not migration units.

---

## C — Per-route migration steps (repeatable)

Use this checklist for each route in §A:

1. Create `routes/.../<feature>-page.svelte.ts` + `set*` / `get*`.
2. Move `*.queries.ts` next to the route; change `load` to `state.seed()` (remove `detailDataContext` seeds).
3. Restructure files:
   - `+layout.svelte` — list shell + `setPageState` when list persists across drawer.
   - `+page.svelte` — list only.
   - `[[id]]/+layout.svelte` — `DetailDrawer` chrome + tab bar (route links).
   - `[[id]]/+page.svelte` — default tab.
   - `[[id]]/{tab}/+page.svelte` — one per tab with own `PageQuery`.
   - `components/` — move views/modals from `lib/components/school/...`.
4. Move mutation calls into state methods; add `entityVersions.bump`.
5. Update `*.loading.test.ts` if present.
6. Mark route ✅ in the table above.

**Tab URL migration:** `?tab=grades` → `/grades`. No redirect layer required for v1 migration; update integration tests (`drawer-tab-url.test.ts` → route-based tests).

---

## D — Legacy deletion gate

**Do not delete until every row in §A and §B is ✅.**

### D.1 Remove — global state & routing

| Path | Reason |
|------|--------|
| `lib/detail-data/context.svelte.ts` | Global entity store |
| `lib/detail-routes.ts` | Central drawer resolution from store |
| `lib/drawer/drawer-detail-hydration.ts` | Store-based drawer hydration |
| `lib/drawer/drawer-tabs-state.svelte.ts` | `?tab=` sync |
| `lib/drawer/drawer-tab-url.ts` | `?tab=` URL helpers |
| `lib/report-cards/context.svelte.ts` | Folded into route/layout state |
| `lib/teaching-log/context.svelte.ts` | Folded into route/layout state |
| `lib/session-detail/context.svelte.ts` | Folded into timetable tab route state (if unused elsewhere) |

### D.2 Remove — feature code in lib

| Path | Reason |
|------|--------|
| `lib/components/school/students/` | Colocated under students route |
| `lib/components/school/guardians/` | Colocated |
| `lib/components/school/teachers/` | Colocated |
| `lib/components/school/configuration/` (feature views) | Colocated — keep only if shared T2 extract remains |
| `lib/components/school/academics/` | Colocated |
| `lib/components/school/finance/` | Colocated |
| `lib/components/school/school-life/` | Colocated |
| `lib/components/school/scheduling/` | Colocated |
| `lib/components/school/attendance/` | Colocated |
| `lib/components/school/dashboard/` | Colocated |
| `lib/students/`, `lib/school/*-state.svelte.ts` | Route state colocation |
| `lib/scheduling/planning-*.svelte.ts` | Route state colocation |
| `lib/queries/*.queries.ts` | Colocated per route (delete central folder) |

### D.3 Refactor — keep but slim down

| Path | Action |
|------|--------|
| `lib/components/school/shared/` | **Keep** — T2 drawer chrome, avatars (per `shared-components-spec`) |
| `lib/api/mutations/*.ts` | Keep files; remove `detailDataContext` patches — callers use state methods only |
| `lib/components/school/shared/DetailDrawer.svelte` | Remove central kind-dispatch once each route owns drawer layout |
| `(app)/+layout.svelte` | Remove global drawer + `parseDetailPath` wiring |

### D.4 Tests to update on deletion

- `tests/lib/drawer/drawer-tab-url.test.ts` — replace with tab route navigation tests
- `tests/integration/demo-dry-run/scenes/drawer-tabs.ts` — use path segments
- `*.loading.test.ts` — assert route-colocated queries
- Grep CI: zero `detailDataContext` imports outside deleted paths

---

## E — Suggested order (not blocking)

Priority follows dependency and pilot value; any order is fine if §C steps are complete per unit.

1. Phase 0 foundation
2. `/school/students` (pilot — list + all tabs)
3. `/school/guardians`, `/school/staff`, `/school/teachers`
4. Smart pickers (unblock cross-route forms)
5. Class module routes (`class-layout` first)
6. Finance → Configuration → Account/Dashboard
7. Legacy deletion (§D)

---

## F — Progress summary

| Area | Total | ✅ |
|------|-------|-----|
| Routes (§A) | 30 | 1 |
| Smart components (§B) | 6 | 0 |
| Phase 0 | 3 | 3 |

**Gate:** §D legacy deletion opens when Routes = 30/30 and Smart components = 6/6.

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-10 | `/school/students` ✅ — full reference slice: nested tab routes, colocated components, route state detail slice, mutations + version bump |
| 2026-07-10 | Students pilot started — Phase 0 + route layout, `StudentsPageState`, colocated list |
| 2026-07-10 | Initial tracker — route + smart component inventory, migration strategy |
