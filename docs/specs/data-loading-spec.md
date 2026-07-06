# Data Loading Spec

> **Applies to:** `apps/webapp` — route data, shared entity state, mutations, drawer sync

This document defines how the webapp loads server data and keeps the UI consistent after local changes.

---

## Goals

1. **Route-scoped loading** — fetch only what the current screen needs.
2. **One source of truth per record** — list, drawer, and mutations read/write the same in-memory record.
3. **Optimistic updates by default** — local UI reflects changes immediately; rollback on failure.
4. **No silent staleness** — after a mutation, every visible surface that shows the affected record updates without a full app reload.

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Shell bootstrap (once per session / year change)               │
│  academicContext: schools, years, periods, classes, nav counts  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Route load (per list route, via PageQuery)                     │
│  query*Page(url) → fetch scoped API data → seed entity store    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│  List / view components  │    │  Detail drawer               │
│  read filtered store     │    │  parseDetailPath → store     │
└──────────────────────────┘    └──────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Mutations (runMutation)                                        │
│  apply → patch entity store → API → rollback on error           │
└─────────────────────────────────────────────────────────────────┘
```

### Three layers

| Layer | Responsibility | Lifetime |
|-------|----------------|----------|
| **Shell context** (`academicContext`) | Global selectors: school, year, period, class tree, sidebar counts | Session; refresh on structural academic changes only |
| **Route query** (`lib/queries/*.queries.ts`) | Declare what a route needs; call API; return `PageLoadMeta` status | Per navigation (`PageQuery` cache key) |
| **Entity store** (`detailDataContext`, also exported as `entityStore`) | Canonical in-memory records for lists, drawers, cross-route references | Grows as routes load; patched by mutations |

Domain-specific stores (e.g. report cards, teaching log) may exist when a bounded context has its own lifecycle, but the same seed / patch / read rules apply.

---

## 1. Shell bootstrap

### Load at bootstrap (always)

- Schools, academic years, periods, grade levels, class groups
- Sidebar student count
- Auth/session

### Do not load at bootstrap

- Students, guardians, staff, subjects, planning, evaluations, finance, school-life, staff permission assignments, report cards, teaching log, or any other module entity collection

### Contract

```ts
const shell = await getAppShellData();
academicContext.initFromShell(shell);
```

### When to refresh shell

Use `runMutation({ refresh: true })` **only** when the mutation changes shell-shaped data:

- Create/activate academic year or period
- Create/update class group
- School switch

Never use full shell refresh for record-level edits (student name, timetable slot, guardian phone, etc.).

---

## 2. Route-scoped loading

### Every list route uses the same pattern

```svelte
<!-- +page.svelte -->
<PageQuery {query} loadingTitle={$t('…')}>
  {#snippet children(data)}
    <DataState status={data.status} …>
      <EntityView … />
    </DataState>
  {/snippet}
</PageQuery>
```

```ts
// lib/queries/<domain>.queries.ts
export function queryClassStudentsPage(classId: string) {
  return (url: URL) => resolvePageLoad(url, {
    empty: () => ({ classId, … }),
    load: async () => {
      const students = await getClassStudents(classId);
      entityStore.seedStudents(students, { classId });
      return { classId, statusScope: { classId }, … };
    },
    hasItems: () => entityStore.studentsForClass(classId).length > 0,
  });
}
```

### Rules

1. **One query function per list route** — named `query<Scope><Entity>Page` (e.g. `querySchoolStaffPage`, `queryClassEvaluationsPage`). `<Scope>` = `School`, `Class`, `Config`, or omitted for global routes.
2. **Fetch the minimum** — filter server-side or client-side to route params (`classId`, `periodId`, etc.).
3. **Seed the entity store inside `load`** — route fetch is the primary hydration path.
4. **Lists read from the entity store** (filtered), not from ephemeral `PageQuery` result. `PageQuery` owns loading / error / empty status only.
5. **No entity reads in `+page.svelte`** — pages orchestrate query + status; views read the store.

### Route data matrix

| Route | Query function | Loads into store |
|-------|----------------|------------------|
| `/dashboard` | `queryDashboardPage` | Overview aggregates only (not entity collections) |
| `/school/students` | `querySchoolStudentsPage` | Students (merge) |
| `/school/guardians` | `querySchoolGuardiansPage` | Guardians + student link ids (merge) |
| `/school/teachers` | `querySchoolTeachersPage` | Teachers (merge) |
| `/school/staff` | `querySchoolStaffPage` | Staff + `permission-catalog` (merge) |
| `/school/calendar` | `querySchoolCalendarPage` | Calendar events (merge) |
| `/school/activities` | `querySchoolActivitiesPage` | Activities (merge) |
| `/school/announcements` | `querySchoolAnnouncementsPage` | Announcements (merge) |
| `/school/events` | `querySchoolEventsPage` | Incidents (merge) |
| `/classes/:id/students` | `queryClassStudentsPage` | Students for class (class slice) |
| `/classes/:id/timetable` | `queryClassTimetablePage` | Planning events for class (replace slice) |
| `/classes/:id/teaching` | `queryClassTeachingPage` | Class subjects / teaching (class slice) |
| `/classes/:id/evaluations` | `queryClassEvaluationsPage` | Assessments for class (replace slice) |
| `/classes/:id/report-cards` | `queryClassReportCardsPage` | Report card results + definitions if needed |
| `/classes/:id/attendance` | `queryClassAttendancePage` | Attendance records for class |
| `/finance/fees` | `queryFinancePage` | Fees, billing, students for links |
| `/finance/billing` | `queryFinancePage` | Fees, billing, students for links |
| `/finance/payment` | `queryPaymentsPage` | Payments (via finance seed) |
| `/configuration/school` | `querySchoolSettingsPage` | School profile |
| `/configuration/academic` | `queryAcademicAdminPage` | Academic structure (shell-backed) |
| `/configuration/grade-levels` | `queryGradeLevelsPage` | Grade levels (shell-backed) |
| `/configuration/classes` | `queryClassGroupsPage` | Class groups + drawer hydration on `[[id]]` |
| `/configuration/subjects` | `queryConfigSubjectsPage` | Subject catalog |
| `/configuration/report-cards` | `queryReportCardDefinitionsPage` | Report card definitions |
| `/configuration/grade-scales` | `queryGradeScalesPage` | Grade scales |
| `/configuration/notifications` | `queryNotificationTemplatesPage` | Notification templates |
| `/configuration/discipline` | `queryDisciplineCatalogPage` | Disciplinary actions catalog |
| `/account/inbox` | `queryInboxPage` | Message deliveries |
| Detail URL `…/[[id]]` | Same query as parent list | Drawer resolves record from store |

**Tab lazy load:** sub-collection data (e.g. staff permission assignments) may load when a drawer tab opens if not seeded by the list route — patch the same store collection; do not duplicate in component state.

### Domain stores

| Store | Path | When |
|-------|------|------|
| `detailDataContext` / `entityStore` | `lib/detail-data/context.svelte.ts` | Default — students, staff, planning, finance, incidents, etc. |
| `reportCardsContext` | `lib/report-cards/context.svelte.ts` | Report card definitions, generation, class results |
| `teachingLogContext` | `lib/teaching-log/context.svelte.ts` | Lesson logbook entries |

Same seed / patch / optimistic rules apply. Prefer `detailDataContext` unless the bounded context already has a domain store.

### Deep-link / refresh on detail URL

1. Parent list query runs (same as list-only URL).
2. `parseDetailPath` resolves `id` from entity store.
3. If record missing after list load → treat as **not found** (close drawer, optional toast).
4. Optional future enhancement: `fetchRecordById` fallback for records outside the list scope.

---

## 3. Entity store

### Purpose

Shared, reactive, in-memory collections keyed by entity type. Used by:

- List views (filtered)
- Detail drawer (`detail-routes.ts`)
- Form modals (dropdowns, related records)
- Mutations (optimistic patch)

### API surface

```ts
// Seed — called from route load
entityStore.seedStudents(students: Student[], scope?: { classId?: string }): void
entityStore.seedPlanning(events: PlanningEvent[], scope: { classId: string }): void

// Read — derived in components or via selectors
entityStore.studentsForClass(classId: string): Student[]

// Patch — called from mutations
entityStore.patchStudent(id: string, patch: Partial<Student>): void
entityStore.appendIncident(incident: Incident): void
entityStore.removeById(collection: 'students', id: string): void
```

Implementations live in `lib/detail-data/context.svelte.ts`. Import `detailDataContext` or `entityStore` (same singleton); call sites use seed / patch / read methods — not ad-hoc arrays.

### Collection policies

| Collection | Seed policy | Notes |
|------------|-------------|-------|
| Students, guardians, staff, teachers | Merge by `id` | School-wide routes add records; class-scoped routes replace that class slice |
| Planning events | Replace class slice | `seedPlanning(events, { classId })` |
| Assessments | Replace class slice | All kinds (`homework`, `quiz`, …) on one route |
| Staff permission assignments | Merge by `id` | Seeded from `/school/staff` load; patched by permission mutations |
| Report cards | Domain store | Same seed / patch rules |

### Store readiness

- Store collections start empty at session start.
- A collection is **ready for a scope** once its owning route has completed `load` and seeded it.
- Drawer open requires: route query finished **and** record present in store (or explicit not-found handling).

---

## 4. Mutations and optimistic updates

All write operations go through `runMutation` in `lib/api/mutations/`.

### Standard shape

```ts
const previous = entityStore.students.find(s => s.id === input.studentId);

await runMutation(() => api.updateStudent(…), {
  apply: () => entityStore.patchStudent(input.studentId, patch),
  rollback: () => {
    if (previous) entityStore.patchStudent(input.studentId, previous);
  },
  successMessage: input.successMessage,
});
```

### Rules

| Rule | Detail |
|------|--------|
| **Default: optimistic** | Provide `apply` + `rollback` for any mutation that changes visible data. |
| **No full refresh** | Do not use `refresh: true` for record edits. |
| **Targeted refetch** | When the server generates derived data (report card generation, aggregated grades), refresh only that domain in `onSuccess`. |
| **Creates** | `apply` appends optimistic record with client id; reconcile id on success if server assigns one. |
| **Deletes** | `apply` removes from store; `rollback` restores snapshot. |
| **Toasts** | Success/error via `runMutation`; no silent failures. |

### Mutation tiers

```
Tier 1 — Optimistic patch (preferred)
  apply / rollback on entity store

Tier 2 — Targeted domain refresh
  onSuccess: refresh only the affected query domain

Tier 3 — Shell refresh (rare)
  refresh: true — academic structure only
```

### Inline toggles (permissions, status chips)

Boolean / single-value toggles (permission cells, status chips): flip immediately, persist via `runMutation`, toast on success/error. Use Tier 1 optimistic patch on the relevant store field.

---

## 5. Loading and empty states

| State | Owner | UI |
|-------|-------|-----|
| Shell not ready | `academicContext.shellReady` | Full-screen spinner in app layout |
| Route loading | `PageQuery` (`result === null`) | In-content spinner |
| Empty / error | `resolvePageLoad` → `PageLoadMeta.status` | `DataState` |
| Drawer waiting | Route query finished + store contains id | Open drawer; otherwise close |

Drawer sync must not depend on a global “all data loaded” flag. It depends on the **current route's** query completing and the target record being in the store.

---

## 6. File layout

```
lib/
  academic/context.svelte.ts      # shell only
  detail-data/context.svelte.ts   # entity store (seed + patch)
  report-cards/context.svelte.ts  # report-card domain store
  teaching-log/context.svelte.ts    # teaching-log domain store
  queries/
    <domain>.queries.ts           # query*Page + scoped getters
    page-status.ts                # resolvePageLoad
  api/
    mutations/
      run-mutation.ts             # apply / rollback / refresh tiers
      <domain>.mutations.ts
  components/ui/
    PageQuery.svelte              # route loader wrapper
```

---

## 7. Anti-patterns

| Do not | Do instead |
|--------|------------|
| Load all domains at app bootstrap | Shell + current route only |
| Render list from `PageQuery` result after seeding store | Render from store; query supplies status |
| `refresh: true` after saving a record | Optimistic patch on entity store |
| Read entity store in `+page.svelte` | Use `PageQuery` + read store in view |
| Fetch in component `$effect` ad hoc | Add or extend `query*Page` |
| Bootstrap and route both fetch the same collection | Single path: route seeds store |
| `apply` without `rollback` | Always pair them |
| Block drawer on unrelated collections loading | Wait on current route query + record lookup |

---

## 8. Testing expectations

- **Route queries** — unit-test `load`, `hasItems`, and store seeding with mocked API.
- **Loading contracts** — use `createRecordingSchoolClient` in `*.loading.test.ts` to assert list payloads and request counts per route; class routes live in `class-route-loading.test.ts`.
- **Intentional school-wide reads** — use `schoolWideEntityList(reason)` from `entity-list-filters.ts` so unscoped catalogs are explicit and grep-able.
- **Mutations** — test `apply` / `rollback` pairs update store correctly.
- **Detail routing** — test `parseDetailPath` lookup from seeded store and missing-id handling.
- **Integration** — mutation on open drawer updates visible list without navigation.

---

## 9. Agent checklist

- [ ] List route has one `query*Page`; `load` seeds `detailDataContext`
- [ ] View reads store (filtered), not raw `PageQuery` payload
- [ ] Mutations use `runMutation` with paired `apply` / `rollback`
- [ ] No `refresh: true` except academic-structure changes
- [ ] Drawer opens only after route query completes and record exists in store
- [ ] No fetch in component `$effect` — extend `query*Page` instead
