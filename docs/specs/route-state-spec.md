# Route State Spec

> **Applies to:** `apps/webapp` — URL-driven loading, route-scoped state, mutations, colocation, smart components

This document defines how the webapp loads server data, holds state, mutates records, and organizes code. **Route state owns entity data.** There is no session-wide entity hydration.

---

## Goals

1. **URL-driven loading** — fetch only what the current route needs; URL params and search params are the navigation contract.
2. **Route-scoped data** — loaded records live on the route (or layout) state class, not a global entity cache.
3. **Colocation** — route-specific UI and state live under the route directory; `lib/` holds shared infrastructure only.
4. **Optimistic mutations** — local UI updates immediately; rollback on failure.
5. **Cross-route consistency** — a lightweight version ledger signals when other routes should invalidate stale data.

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Shell (session) — lib/academic/context.svelte.ts               │
│  schools, years, periods, classes, nav counts, auth             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Version ledger (session) — lib/entity-versions.svelte.ts       │
│  { students: 0, guardians: 1, … } — bumped on successful writes │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Route / layout state — routes/.../*-page.svelte.ts             │
│  PageQuery(url) → fetch → seed route state · views read state   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│  Route components        │    │  Nested tab routes           │
│  routes/.../components/  │    │  [[id]]/guardians/+page.svelte│
└──────────────────────────┘    └──────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Mutations — page state methods via runMutation                 │
│  apply → patch route state → bump version → rollback on error   │
└─────────────────────────────────────────────────────────────────┘
```

### Four tiers

| Tier | What | Where | Lifetime |
|------|------|-------|----------|
| **1 — Shell** | Auth, academic selectors, nav counts | `lib/academic/context.svelte.ts` | Session |
| **2 — Version ledger** | Per-entity-family version counters | `lib/entity-versions.svelte.ts` | Session |
| **3 — Route / layout state** | Entity collections, filters, selection, mutations | `routes/.../*-page.svelte.ts` | Route subtree |
| **4 — UI** | Modal open, form binding, visual flags | Component `<script>` | Component |

**Smart components** (pickers, scope builders) are a parallel pattern: not route-bound, but use the same class + context structure as Tier 3. See §8.

**Rule:** I/O, multi-component orchestration, or testable business logic → **not** Tier 4.

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

## 2. File colocation

### Route features

```
routes/(app)/school/students/
  +layout.svelte                 # sets StudentsPageState, renders list shell
  students-page.svelte.ts        # route state class + set/get context
  students.queries.ts            # querySchoolStudentsPage(url)
  +page.svelte                   # list — /school/students
  [[id]]/
    +layout.svelte               # DetailDrawer shell
    +page.svelte                 # default tab — /school/students/:id
    guardians/
      +page.svelte               # /school/students/:id/guardians
    components/
      StudentDetailHeader.svelte
      GuardianTab.svelte
  components/
    StudentsList.svelte
    StudentCreateModal.svelte
```

### `lib/` — shared only

| In `lib/` | Not in `lib/` |
|-----------|----------------|
| `PageQuery`, `DataState`, `runMutation` | `StudentsList.svelte` |
| API clients, types, i18n, URL filter helpers | `students-page.svelte.ts` |
| Dumb UI (`lib/components/ui/`) | Route-specific modals |
| Smart components (`lib/smart-components/`) | Feature orchestration state |
| Shell + version ledger | |

**Litmus test:** used by more than one route, or generic infrastructure? → `lib/`. Otherwise → colocate under the route.

### Layout state

Layouts that need their own data follow the same pattern as pages:

```
routes/(app)/classes/[classId]/
  +layout.svelte
  class-layout.svelte.ts         # class-scoped shared state for child routes
  class-layout.queries.ts
```

Set layout state in `+layout.svelte`; child routes and components access it via `set*` / `get*` context.

---

## 3. Route state class

### Pattern

```ts
// routes/(app)/school/students/students-page.svelte.ts
import { getContext, setContext } from 'svelte';
import { entityVersions } from '$lib/entity-versions.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';

const KEY = Symbol('StudentsPageState');

export class StudentsPageState {
  students = $state<Student[]>([]);
  private loadedVersion = 0;

  readonly filters: ListFiltersState<{ q: string; class: string; status: string }>;

  constructor(getUrl: () => URL) {
    this.filters = new ListFiltersState({ getUrl, write: writeStudentListFilters, … });
  }

  seed(students: Student[]) {
    this.students = students;
    this.loadedVersion = entityVersions.students;
  }

  get visibleStudents() {
    return this.filterVisible(this.students);
  }

  get selected() {
    return this.students.find(s => s.id === this.selectedId);
  }

  patchStudent(id: string, patch: Partial<Student>) {
    const i = this.students.findIndex(s => s.id === id);
    if (i >= 0) this.students[i] = { ...this.students[i], ...patch };
  }

  async updateStudent(input: UpdateStudentInput) {
    const previous = this.students.find(s => s.id === input.id);
    await runMutation(() => api.updateStudent(input), {
      apply: () => {
        this.patchStudent(input.id, input.patch);
        entityVersions.bump('students');
      },
      rollback: () => {
        if (previous) this.patchStudent(input.id, previous);
      },
      successMessage: input.successMessage,
    });
  }

  async invalidateIfStale() {
    if (this.loadedVersion === entityVersions.students) return;
    await this.refetch();
    this.loadedVersion = entityVersions.students;
  }
}

export function setStudentsPageState(state: StudentsPageState) {
  setContext(KEY, state);
}

export function getStudentsPageState() {
  return getContext<StudentsPageState>(KEY);
}
```

### Class rules

- `$state` fields for mutable data
- Getters for derived values
- Arrow methods for handlers passed to DOM events
- Cleanup via `onDestroy` in constructor when needed
- **No `$effect` in state classes**
- **Route `PageQuery` performs fetch** — state class receives `seed()`; tab routes may call `seedTab()` on the same instance
- **Mutations live on the state class** — components call `state.updateStudent(…)`, not raw `runMutation`

### Context wiring

- **Parent** (`+layout.svelte` or `+page.svelte`): `setStudentsPageState(new StudentsPageState(() => $page.url))`
- **Children** (`routes/.../components/*`, nested tab pages): `getStudentsPageState()`

### Do not

- Copy entity arrays into component-local `$state` when the route state already holds them
- Fetch in component `$effect` — extend the route query or call a state method triggered by URL change

---

## 4. URL-driven loading

### Standard list route

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { setStudentsPageState, StudentsPageState } from './students-page.svelte';
  import { querySchoolStudentsPage } from './students.queries';

  const state = new StudentsPageState(() => $page.url);
  setStudentsPageState(state);
  const query = querySchoolStudentsPage(state);
</script>

<PageQuery {query} loadingTitle={$t('school.students')}>
  {#snippet children(data)}
    <DataState status={data.status} …>
      <StudentsList />
    </DataState>
  {/snippet}
</PageQuery>
```

```ts
// students.queries.ts
export function querySchoolStudentsPage(state: StudentsPageState) {
  return (url: URL) => resolvePageLoad(url, {
    empty: () => ({ status: 'empty' }),
    load: async () => {
      const students = await getSchoolStudents(url);
      state.seed(students);
      return { status: 'ready' };
    },
    hasItems: () => state.students.length > 0,
  });
}
```

### Rules

1. **One query function per route** — named `query<Scope><Entity>Page` (e.g. `querySchoolStaffPage`, `queryClassEvaluationsPage`). Colocate with the route as `<feature>.queries.ts`.
2. **Fetch the minimum** — filter server-side or client-side to route params (`classId`, `periodId`, etc.).
3. **Seed route state inside `load`** — not a global store.
4. **Views read route state** — `PageQuery` owns loading / error / empty status only.
5. **`+page.svelte` orchestrates** — query + `DataState` + thin wiring; no entity rendering logic.

### URL filters and pagination

- **URL** → search, facet filters, page/offset keys (`q`, `class`, `status`, …)
- **Route state** → loaded pages, `total`, `loadedVersion`
- **List view** → reads state; never fetches

Filter state uses `ListFiltersState` with `read*ListFilters` / `write*ListFilters` helpers from `lib/list/`.

### `PageQuery` contract

`PageQuery` caches by URL-derived key. **Entity payloads are not in the cache** — only `PageLoadMeta` status. When a route layout unmounts, call `releaseRoutePageQueryOnDestroy(getUrl)` so the next visit re-runs `load` and seeds a new state instance.

---

## 5. Drawer detail and tab routes

### List + drawer

Complex entities use optional `[[id]]` segment. The list layout persists; the drawer opens when `id` is present.

```
/school/students           → list only
/school/students/stu-1     → list + drawer (default tab)
/school/students/stu-1/guardians → list + drawer (guardians tab)
```

### Tabs are nested routes — not `?tab=` query params

Each drawer tab is a child route with its own `PageQuery`:

```
[[id]]/
  +layout.svelte           # DetailDrawer chrome, tab bar (route links)
  +page.svelte             # default tab content
  guardians/+page.svelte   # lazy-loaded tab data
  attendance/+page.svelte
```

**Ownership:**

- Parent layout state holds the list collection and `selected` record (resolved from `id` param).
- `[[id]]/+layout.svelte` renders drawer chrome and tab navigation.
- Each tab `+page.svelte` runs its own query and writes into a tab slice on the parent state (e.g. `state.tabData.guardians`) or a nested `StudentDetailState` set on the `[[id]]` layout.

**Default tab:** `[[id]]/+page.svelte` — URL ends at the entity id with no extra segment.

### Deep-link / not-found

1. Parent list query runs.
2. Route state resolves `selected` by `id` from its collection.
3. If record missing after list load → **not found** (close drawer, optional toast).
4. Optional future enhancement: `fetchRecordById` fallback for records outside list scope.

### Drawer sync

Drawer open requires: parent route query finished **and** `selected` resolves in route state (or explicit not-found handling). Do not block on unrelated routes or collections.

---

## 6. Version ledger

### Purpose

Coordinate cross-route freshness without a global entity store. When any route mutates students, other routes holding student data can detect drift and refetch.

### API

```ts
// lib/entity-versions.svelte.ts
export class EntityVersions {
  students = $state(0);
  guardians = $state(0);
  staff = $state(0);
  // …

  bump(key: EntityVersionKey) {
    this[key]++;
  }
}

export const entityVersions = new EntityVersions();
```

### Rules

| Rule | Detail |
|------|--------|
| **Bump on successful `apply`** | Not on rollback |
| **Bump per entity family** | `students`, not per-record id |
| **Same-route mutations** | Patch local state directly; bump for other routes |
| **Invalidation is pull-based** | Active route states call `invalidateIfStale()` on navigate or focus — not a global push sync |
| **Start coarse** | Add per-scope versions only if profiling shows refetch cost |

---

## 7. Mutations

All writes go through `runMutation` in `lib/api/mutations/`, invoked from route state methods.

### Standard shape

```ts
async updateStudent(input: UpdateStudentInput) {
  const previous = this.students.find(s => s.id === input.id);
  await runMutation(() => api.updateStudent(input), {
    apply: () => {
      this.patchStudent(input.id, input.patch);
      entityVersions.bump('students');
    },
    rollback: () => {
      if (previous) this.patchStudent(input.id, previous);
    },
    successMessage: input.successMessage,
  });
}
```

### Rules

| Rule | Detail |
|------|--------|
| **Default: optimistic** | Paired `apply` + `rollback` for any mutation that changes visible data |
| **No full refresh** | Do not use `refresh: true` for record edits |
| **Targeted refetch** | When the server generates derived data, refresh only that tab/query domain in `onSuccess` |
| **Creates** | `apply` appends optimistic record; reconcile id on success if server assigns one |
| **Deletes** | `apply` removes from collection; `rollback` restores snapshot |
| **Toasts** | Success/error via `runMutation`; no silent failures |

### Mutation tiers

```
Tier 1 — Optimistic patch (preferred)
  apply / rollback on route state + version bump

Tier 2 — Targeted domain refresh
  onSuccess: re-run the affected tab query or state.refetch()

Tier 3 — Shell refresh (rare)
  refresh: true — academic structure only
```

### Inline toggles

Boolean / single-value toggles (status chips, attendance checkboxes): flip immediately, persist via state mutation method, toast on success/error.

---

## 8. Smart components

Smart components are shared, self-contained features that are **not** route-bound but large enough to warrant the same structure as a route feature.

**Examples:** `StudentPicker`, `StaffPicker`, `GuardianPicker`, `ScopeBuilder`.

```
lib/smart-components/
  student-picker/
    student-picker-state.svelte.ts
    StudentPicker.svelte
    components/
      StudentPickerRow.svelte
```

| Property | Route feature | Smart component |
|----------|---------------|-----------------|
| Bound to URL | Yes | No — props in, events out |
| Own fetch | Via route `PageQuery` | Self-contained API on open/search |
| State class + context | Yes | Yes |
| Version ledger | `invalidateIfStale` on navigate | Optional — refetch open results when version drifts |
| Location | `routes/.../` | `lib/smart-components/` |

Smart components **do not** read route state from another feature. They fetch what they need independently.

---

## 9. Component script (Tier 4)

```svelte
<script lang="ts">
  import { getStudentsPageState } from '../students-page.svelte';
  import StudentsCreateModal from './StudentCreateModal.svelte';

  const state = getStudentsPageState();
  let createOpen = $state(false);
  const rows = $derived(state.visibleStudents);
</script>
```

**Keep in component:** modal open flags, form binding inside modals, CSS/focus.

**Move out:** fetch, business rules, shared selection, debounce/pagination, mutations.

**Extraction threshold:** extract route state methods when a view script exceeds **~60 lines** of non-markup logic, or when two sibling components share orchestration.

---

## 10. Loading and empty states

| State | Owner | UI |
|-------|-------|-----|
| Shell not ready | `academicContext.shellReady` | Full-screen spinner in app layout |
| Route loading | `PageQuery` (`result === null`) | In-content spinner |
| Empty / error | `resolvePageLoad` → `PageLoadMeta.status` | `DataState` |
| Drawer waiting | Route query finished + `selected` resolves | Open drawer; otherwise close |
| Tab loading | Tab route `PageQuery` | In-drawer `DataState` or section skeleton |

---

## 11. SSR

- No user-specific mutable module `$state` during SSR.
- Guard `localStorage` with `browser`.
- Route state is created per navigation on the client; layouts recreate state when scope params change.

---

## 12. Legacy `detailDataContext`

The session-wide entity store (`lib/detail-data/context.svelte.ts`) is **deprecated for new work**. Existing screens may still use it during migration.

**New features must:**

- Own entity data on route state
- Bump `entityVersions` on mutation
- Colocate state and components under `routes/`

Migrate existing routes incrementally; do not extend `detailDataContext` seed methods for new entity types.

---

## 13. Anti-patterns

| Do not | Do instead |
|--------|------------|
| Load module entities at app bootstrap | Shell + current route only |
| Seed a global entity store on route load | `state.seed()` on route state |
| Put feature views in `lib/components/school/…` | `routes/.../components/` |
| Put feature state in `lib/<domain>/…` | `routes/.../*-page.svelte.ts` |
| Fetch in component `$effect` | Route `PageQuery` or smart component state |
| `refresh: true` after saving a record | Optimistic patch on route state |
| `?tab=` for drawer tabs | Nested child routes under `[[id]]/` |
| `apply` without `rollback` | Always pair them |
| Smart component reads another route's state | Self-fetch via smart component state |
| `onclick={state.reset}` | `() => state.reset()` or arrow method |

---

## 14. Testing

- **Route state classes** — unit-test `seed`, `patch*`, `filterVisible`, mutation apply/rollback with Vitest (`new StudentsPageState()`, mock API). No Svelte mount required.
- **Route queries** — unit-test `load`, `hasItems`, and state seeding with mocked API.
- **Loading contracts** — `*.loading.test.ts` with `createRecordingSchoolClient` to assert payloads and request counts per route.
- **Version ledger** — test that mutation bumps version and `invalidateIfStale` triggers refetch.
- **Detail routing** — test `selected` resolution and missing-id handling from route state.
- **Smart components** — unit-test picker state search and selection independently of routes.

---

## 15. Agent checklist

- [ ] Route state class colocated under `routes/.../*-page.svelte.ts`
- [ ] Route components under `routes/.../components/` — not `lib/components/<domain>/`
- [ ] One `query*Page` per route; `load` seeds route state
- [ ] Views read route state — `PageQuery` supplies status only
- [ ] Mutations on state class via `runMutation` with paired `apply` / `rollback`
- [ ] Successful mutation bumps `entityVersions` for the entity family
- [ ] No `refresh: true` except academic-structure changes
- [ ] Drawer tabs are nested routes under `[[id]]/`
- [ ] No fetch in component `$effect`
- [ ] Smart components in `lib/smart-components/` with own state — no route state reads
- [ ] No new `detailDataContext` seeding
