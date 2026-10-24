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
6. **Addressable views** — every substantive view can be reconstructed from its pathname and search parameters.

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
│  Mutations — page state methods via a route mutation runner     │
│  apply → request → onSuccess → bump versions → toast / rollback │
└─────────────────────────────────────────────────────────────────┘
```

### Four tiers

| Tier | What | Where | Lifetime |
|------|------|-------|----------|
| **1 — Shell** | Auth, academic selectors, nav counts | `lib/academic/context.svelte.ts` | Session |
| **2 — Version ledger** | Per-entity-family version counters | `lib/entity-versions.svelte.ts` | Session |
| **3 — Route / layout state** | Entity collections, filters, selection, mutations | `routes/.../*-page.svelte.ts` | Route subtree |
| **4 — UI** | Form drafts, focus, transient visual flags | Component `<script>` | Component |

**Smart components** (pickers, scope builders) are a parallel pattern: not route-bound, but use the same class + context structure as Tier 3. See §8.

**Rule:** I/O, multi-component orchestration, or testable business logic → **not** Tier 4.

**Addressability rule:** opening a modal, choosing an edit target, changing a wizard step,
switching a substantive internal panel, or changing a shareable list view is navigation state —
not Tier 4. Field drafts, credentials, focus, hover, popovers, busy flags and validation messages remain component-local and must not be encoded in the URL.
Entity optimistic updates and rollback belong to owner state.

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

Use a full shell refresh **only** when the mutation changes shell-shaped data:

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
    +layout.svelte               # route-local drawer shell
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
| `PageQuery`, `DataState`, shared mutation runner contracts | `StudentsList.svelte`, one-route mutation runners |
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
    await runStudentRouteMutation({
      request: () => api.updateStudent(input),
      apply: () => {
        this.patchStudent(input.id, input.patch);
      },
      rollback: () => {
        if (previous) this.patchStudent(input.id, previous);
      },
      successMessage: input.successMessage,
      errorMessage: input.errorMessage,
      versionKeys: ['students'],
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
- **Mutations live on the state class** — components call `state.updateStudent(…)`, not a raw API client or mutation runner

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
import type { PageLoadMeta } from '$lib/page/load-state';

export function querySchoolStudentsPage(state: StudentsPageState) {
  return async (url: URL): Promise<PageLoadMeta> => {
    try {
      const students = await getSchoolStudents(url);
      state.seed(students);
      return { status: state.students.length > 0 ? 'ready' : 'empty' };
    }
    catch {
      return { status: 'error', errorMessage: 'Unable to load this page.' };
    }
  };
}
```

Route query functions may use a shared or route-local page-load resolver, but the resolver must return `PageLoadMeta` (`ready` / `empty` / `error`), keep entity payloads on route state, expose an `errorMessage` on failure, and leave rendering to `PageQuery` + `DataState`.

### Rules

1. **One query function per route** — named `query<Scope><Entity>Page` (e.g. `querySchoolStaffPage`, `queryClassEvaluationsPage`). Colocate with the route as `<feature>.queries.ts`.
2. **Fetch the minimum** — filter server-side or client-side to route params (`classId`, `periodId`, etc.).
3. **Seed route state inside `load`** — not a global store.
4. **Views read route state** — `PageQuery` owns loading / error / empty status only.
5. **`+page.svelte` orchestrates** — query + `DataState` + thin wiring; no entity rendering logic.

### URL filters and infinite loading

- **URL** → search, facet filters and sorting (`q`, `class`, `status`, …); list offsets are not navigation state.
- **Route state** → loaded batches, next offset/cursor, `total`, `loadedVersion`, load-more pending/error state. Preserve batches during detail navigation and refresh; reset on filter/scope changes and reject stale completions.
- **List view** → reads state; never fetches

Filter state uses `ListFiltersState` with `read*ListFilters` / `write*ListFilters` helpers from `lib/list/`.

### Addressable overlay and workflow state

Path segments own structural hierarchy:

- Page / list route
- Selected complex entity (`/[id]`)
- Drawer tab (`/[id]/{tab}`)

Search parameters own substantive overlays and workflow subviews:

| Parameter | Meaning |
|-----------|---------|
| `modal` | Route-local modal / form / confirmation kind |
| `modalTarget` | Record id when the pathname does not already identify the target |
| `modalStep` | Stable wizard step slug |
| `modalTab` | Stable substantive panel inside the active modal |
| `view` | Shareable presentation mode such as `cards` / `table` |

Rules:

1. The route declares an allow-list for modal, step, tab, and view values. Staff permissions expose `default-scopes` for selected-year defaults and `apply-profile` with `modalTarget` for editing a saved profile assignment.
2. A URL-backed edit modal resolves `modalTarget` from route state. It must not depend on a
   transient object retained from the click handler.
3. Invalid or inaccessible values canonicalize to the nearest valid URL using `replaceState`.
4. Form field values, passwords, OTPs, uploaded data, and unsaved records never go in search params.
   Use component state and SvelteKit snapshots for safe draft restoration.
5. `page.state` may carry non-authoritative history metadata or preloaded result payloads, but the
   substantive view must still be reconstructable from the URL after reload.
6. Use real URL navigation, not shallow `page.state` alone, for shareable views.

### History semantics

- Opening a drawer, modal, or wizard creates a history entry.
- Switching drawer tabs or substantive wizard steps creates a history entry.
- High-frequency list filter typing uses `replaceState`; deliberate filter selections may also
  replace the current entry.
- Close / Escape / backdrop navigates Back only when history metadata proves the current surface
  was opened from its canonical parent in this app session.
- Direct links and reloaded overlay URLs close by replacing to the canonical parent URL.
- Closing a drawer must not push a second list entry that makes Back reopen the drawer.

### `PageQuery` contract

`PageQuery` caches by URL-derived key by default. Use `cache={false}` for a view whose route state retains only its current selection and must reload current facts on each visit; class profile teacher assignments use this option. **Entity payloads are not in the cache** — only `PageLoadMeta` status. When a route layout unmounts, call `releaseRoutePageQueryOnDestroy(getUrl)` so the next visit re-runs `load` and seeds a new state instance.

Academic year selection lives in the sidebar. Term pickers beside affected page/tab/action content share `academicContext`; they do not create independent route selections. Empty years clear the term instead of reusing another year’s term or redirecting the year. The app shell must own academic-context invalidation. When school, academic year, or period changes, the central shell mechanism shall:

1. Clear affected `PageQuery` cache entries.
2. Invalidate the active route state (`invalidateIfStale()` or a route-scoped refresh callback).
3. Preserve the current route URL unless the selected scope makes the route inaccessible.

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
  +layout.svelte           # route-local drawer shell, tab bar (route links)
  +page.svelte             # default tab content
  guardians/+page.svelte   # lazy-loaded tab data
  attendance/+page.svelte
```

**Ownership:**

- Parent layout state holds the list collection and `selected` record (resolved from `id` param).
- `[[id]]/+layout.svelte` renders drawer chrome and tab navigation. It may use a shared drawer shell or a route-local shell.
- Each tab `+page.svelte` runs its own query and writes into a tab slice on the parent state (e.g. `state.tabData.guardians`) or a nested `StudentDetailState` set on the `[[id]]` layout.

**Route-local drawer shell contract:**

- Shell header: entity type chip + close button only.
- Entity header: `DrawerEntityHeader` for identity, chips, and up to two primary actions.
- Body: route-link tab bar plus read-only tab content; no open form fields on initial render.
- Close behavior: header close, backdrop click, and `Escape` navigate back to the list URL and remove modal query params.
- Layout: full-width mobile, `md:w-1/2` desktop overlay, `shadow-panel`, list remains behind the drawer.
- Footer: omit when the shell header has Close; if present, Close only.

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

```ts
// lib/navigation/route-version-snapshot.ts
export class RouteVersionSnapshot {
  constructor(private readonly families: readonly EntityVersionKey[]) {}
  markLoaded() { /* snapshot entityVersions[f] for each family */ }
  isStale() { /* true when any family drifted */ }
}
```

Register pull-based invalidation in the route layout:

```ts
registerVersionInvalidation(pageState); // calls invalidateIfStale() after navigate
```

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
| **Bump after server success** | Apply optimistic state before the request, but bump versions only after the request succeeds and any `onSuccess` settles, even if the refresh fails |
| **Bump per affected entity family** | `students`, not per-record id; cross-entity writes bump every affected family (`students` + `guardians`, etc.) |
| **Same-route mutations** | Patch local state directly; bump for other routes |
| **Invalidation is pull-based** | Active route states call `invalidateIfStale()` on navigate or focus — not a global push sync |
| **Track every loaded family** | Route state keeps a `RouteVersionSnapshot` for each entity family in its slice; `markLoaded()` after fetch, `isStale()` before refetch |
| **Start coarse** | Add per-scope versions only if profiling shows refetch cost |

---

## 7. Mutations

All writes go through a route state method. The method must call the API client through a mutation runner that satisfies the contract below. The runner may be shared infrastructure or route-local when decoupling a route from legacy primitives.

### Mutation runner contract

```ts
type RouteMutationOptions<T> = {
  request: () => Promise<T>;
  apply?: () => void;
  rollback?: () => void;
  onSuccess?: (result: T) => void | Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  versionKeys?: EntityVersionKey[];
};
```

Execution order is mandatory:

1. Run `apply` before `request`.
2. Run `rollback` only if `apply` or `request` fails. Once the server confirms success, a failing `onSuccess` is a display refresh failure, not a failed write.
3. Run `onSuccess` after server success.
4. Bump every `versionKeys` entry after `onSuccess` settles, including refresh failure, so stale views can refetch.
5. Show `successMessage` after version bumps when refresh succeeds. If refresh fails after a confirmed write, retain the successful result and show localized saved-but-refresh-failed guidance; never roll back or repeat the write.
6. Show `errorMessage` or the parsed server error after request rollback. HTTP 409 uses localized reload-and-review guidance. Family feedback maps recognized domain failure codes to specific localized prerequisite guidance and reloads the affected campaign once after a rejected lifecycle command; it never retries the command. Late lifecycle results must not patch another active profile, school or year. Generic mutation runners never retry requests automatically.

### Standard shape

```ts
async updateStudent(input: UpdateStudentInput) {
  const previous = this.students.find(s => s.id === input.id);
  await runStudentRouteMutation({
    request: () => api.updateStudent(input),
    apply: () => {
      this.patchStudent(input.id, input.patch);
    },
    rollback: () => {
      if (previous) this.patchStudent(input.id, previous);
    },
    successMessage: input.successMessage,
    errorMessage: input.errorMessage,
    versionKeys: ['students'],
  });
}
```

### Rules

| Rule | Detail |
|------|--------|
| **Default: optimistic** | Paired `apply` + `rollback` for any mutation that changes visible data |
| **Rollback required for visible changes** | If `apply` changes route-visible data, `rollback` must restore the previous snapshot or remove the optimistic record |
| **No full shell refresh** | Do not refresh the app shell for record edits |
| **Targeted refetch** | When the server generates derived data, refresh only that tab/query domain in `onSuccess` |
| **Creates** | `apply` appends optimistic record; reconcile id on success if server assigns one |
| **Deletes** | `apply` removes from collection; `rollback` restores snapshot |
| **Toasts** | Success/error feedback is mandatory; no silent failures |
| **Version keys** | `versionKeys` defaults to the primary entity family only when the write affects exactly one family; cross-entity writes must pass every affected family explicitly |

### Mutation tiers

```
Tier 1 — Optimistic patch (preferred)
  apply / rollback on route state + versionKeys bump after success

Tier 2 — Targeted domain refresh
  onSuccess: re-run the affected tab query or state.refetch()

Tier 3 — Shell refresh (rare)
  full shell refresh — academic structure only
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
  import { bindUrlModal } from '$lib/modal/modal-state.svelte';

  const state = getStudentsPageState();
  const createOpen = bindUrlModal(state.modals, 'create');
  const rows = $derived(state.visibleStudents);
</script>
```

**Keep in component:** form field drafts inside modals, CSS/focus, ephemeral popover/dropdown state.

**Move out:** modal kind/target/step/tab, fetch, business rules, shared selection,
debounce/pagination, mutations.

**Extraction threshold:** extract route state methods when a view script exceeds **~60 lines** of non-markup logic, or when two sibling components share orchestration.

---

## 10. Loading and empty states

| State | Owner | UI |
|-------|-------|-----|
| Shell not ready | `academicContext.shellReady` | Full-screen spinner in app layout |
| Route loading | `PageQuery` (`result === null`) | In-content spinner |
| Empty / error | Route page-load resolver → `PageLoadMeta.status` | `DataState` |
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
- Bump `entityVersions` via mutation `versionKeys`
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
| Full shell refresh after saving a record | Optimistic patch on route state |
| `?tab=` for drawer tabs | Nested child routes under `[[id]]/` |
| Local boolean for a substantive modal / form | `?modal=` through the route URL-surface state |
| URL edit modal with a transient target object | `?modal=edit&modalTarget={id}` resolved from route state |
| Wizard step only in component state | Stable `?modalStep=` value; keep field drafts local |
| `page.state` as the only modal state | Pathname / search params as source of truth |
| `apply` without `rollback` | Always pair them |
| Smart component reads another route's state | Self-fetch via smart component state |
| `onclick={state.reset}` | `() => state.reset()` or arrow method |

---

## 14. Testing

- **Route state classes** — unit-test `seed`, `patch*`, `filterVisible`, mutation apply/rollback with Vitest (`new StudentsPageState()`, mock API). No Svelte mount required.
- **Route queries** — unit-test `load`, `hasItems`, and state seeding with mocked API.
- **Loading contracts** — `*.loading.test.ts` with `createRecordingSchoolClient` to assert payloads and request counts per route.
- **Version ledger** — test that mutation bumps every affected version key and `invalidateIfStale` triggers refetch.
- **Detail routing** — test `selected` resolution and missing-id handling from route state.
- **Addressable views** — test deep links, reload, Back/Forward, invalid target canonicalization,
  direct-link close, Escape, and backdrop close.
- **Smart components** — unit-test picker state search and selection independently of routes.

---

## 15. Agent checklist

- [ ] Route state class colocated under `routes/.../*-page.svelte.ts`
- [ ] Route components under `routes/.../components/` — not `lib/components/<domain>/`
- [ ] One `query*Page` per route; `load` seeds route state
- [ ] Views read route state — `PageQuery` supplies status only
- [ ] Mutations on state class via a mutation runner with `request`, paired `apply` / `rollback`, toasts, and `versionKeys`
- [ ] Successful mutation bumps `entityVersions` for every affected entity family
- [ ] No full shell refresh except academic-structure changes
- [ ] Drawer tabs are nested routes under `[[id]]/`
- [ ] Every substantive modal / form / confirmation uses `modal` and, when needed, `modalTarget`
- [ ] Wizard steps and substantive modal panels use allow-listed `modalStep` / `modalTab`
- [ ] Back, Forward, reload, direct-link close, Escape, and backdrop behavior are tested
- [ ] Sensitive values and form drafts are not encoded in the URL
- [ ] No fetch in component `$effect`
- [ ] Smart components in `lib/smart-components/` with own state — no route state reads
- [ ] No new `detailDataContext` seeding

## Account authentication flows

`/account/security` is an Account-level route, independent of a selected school profile. Removal confirmation is addressable with `?unlink=<identifier-id>`. OTP/TOTP challenges, enrollment secrets and recovery codes stay in component-owned flow state and never enter URLs, browser storage, or entity caches. Reloading an in-progress challenge restarts authentication. Security mutations require fresh authentication; sensitive enrollment/recovery submissions are pessimistic and never optimistic.

## Correction route state

`corrections-page.svelte.ts` owns the scoped queue and selected request. Filter options come from authorized correction records. URL keys are workflow, status, classGroupId, teacherSubjectId, studentId, search, from, to, correction and action. Loaded batches and the next offset stay in route state; filter/scope changes reset to the first batch, and stale pagination responses cannot append to a newer collection. Selection persists on reload. Decisions carry the displayed request version; stale review must reload before deciding. Mutations retain filters and refresh the queue.

### Conversation route state

The `/school/messages` layout owns its list, selected thread, read positions, infinite-loading batches and transient reply draft through MessagesPageState and PageQuery. Optional conversation type, status, order, selected conversation and reply-modal state are reconstructed from the URL. Immutable messages use command request identities; successful replies/resolution bump inbox versions and refresh the owning route. Identity switches clear content and drafts and discard stale completions. Refresh all loaded conversation batches every 15 seconds and on visibility resume; stop when hidden or unmounted.

## State ownership completion

Route/tab state owns runtime API writes, import execution and auxiliary entity reads. Shared presentational controls receive typed action callbacks. Self-contained shared invitation and staff-permission workflows own I/O in smart-component state. Shell-wide profile-photo actions use the account state registered by the app layout.

`VersionedRouteQuery` retains the last visited tab query and URL, while entity payloads stay on tab state. Register that state for navigation invalidation, snapshot every loaded entity family after a successful query, refresh only visited stale tabs, and abort/clear on drawer teardown. Failed or aborted background refreshes leave the snapshot stale for a later retry. Bump every affected family after confirmed writes, including import rows that persisted before a partial failure. School settings and period definitions use their own version families; they do not trigger unrelated entity reloads.

Messaging has one initial/identity query owner: the identity-keyed `PageQuery`. Its query key tracks pathname and queue filters, excluding reply modal navigation. Polling and visibility refresh retain stale-response guards and reviewed-version reply conflicts.

Authentication invitation acceptance uses route-owned I/O with its existing explicit committed-write/session-refresh handling; a failed session refresh must not repeat a confirmed acceptance. Credentials and form drafts remain local to the view.

Repository verification rejects retired module imports, runtime mutation/client imports from Svelte presentation, and references to absent workspace applications. Type-only imports, API error values and pure payload/display helpers are permitted.

Permission forms share a preview state owner that captures complete immutable command snapshots and checks payload, active form session, and request generation before publishing results. The staff page owns combined creation-form profile/catalog data, loading, errors, retry, and cancellation on school or form-session replacement.

The app shell owns a per-instance `MessageCountState` provided through Svelte context. Its Messages sidebar badge is numeric only and counts all authorized conversations in both `awaiting_school` and `awaiting_guardian` states, using server totals independently of inbox filters and loaded batches. Fetch only with school-inbox read or teacher-review permission; refresh on inbox version changes, every 15 seconds while visible, and visibility resume. Hide unavailable counts rather than showing zero. Scope changes invalidate pending results and hide the previous account's count. No badge is rendered in the page heading.

### Timetable generation

Configuration Tools owns the generation assistant and submits the selected class IDs in one `generateSchoolTimetable` request. The backend transaction preserves protected sessions and replaces only eligible slots. On success invalidate planning once and show generated-session results. On failure retain the previous timetable; there is no partial class-by-class success or publication phase. Legacy publish/republish modal URLs canonicalize to the Tools page. `timetableGenerated` is a boolean provenance marker, not a lifecycle state.


### School, grading-scale and report-model editors

School profile section modals are `identity`, `issuing`, `location`, and `assets`; there is no page-wide edit modal. The dedicated `/configuration/grade-scales` page owns `scale` for expansion plus `create`, `edit`, `delete`, `add-interval`, `edit-interval`, and `delete-interval` modals. Interval targets include scale and interval IDs. Report-model metadata mutations carry optional passThreshold; omitted values preserve it, and null clears it. Generation captures it without updating existing results. Legacy scale URLs retain their search parameters when redirecting.

Report model drawers own metadata and section edit/add/delete modals. Editors capture their opening revision; a changed server revision rejects the save and requires reloading, without discarding the visible draft. Catalog/model mutations do not trigger report recalculation.

### Level configuration scope

`/configuration/structure/{details|subjects|classes}` uses `gradeLevel` as its URL-backed level selection and `levelQ` for level search. Switching level or tab clears collection search and detail/modal context. The parent retains the level settings state; child routes own their collections and drawers. The level form owns metadata and grading drafts with one Save action and URL-backed calculation confirmation. Keep the opened policy revision and retain drafts after errors; after a partial save, retry only unsaved changes using the same created level ID. Legacy `level-grading` links canonicalize to `edit-level`. Deep-linked subject/class records resolve their actual level before canonicalizing the filter. Subject reads query grade-level allocations by level and academic year, then only their linked subjects and chapters; an empty year must stay empty. Page query keys include level and academic context, and aborted/stale loads cannot seed a newer selection. Subjects use an uncached PageQuery because route state retains only the active slice. Old configuration links redirect into this hierarchy with valid modal and tab context preserved.

### Staff permission presentation

Staff detail tabs are Profile and Permissions; legacy staff Assignments child routes redirect to Permissions with query parameters preserved and do not load assignments. Permissions route state retains structured scope-render results for effective tags and separately renders saved default selections. Late scope-label loads must not overwrite a newer school/year or refresh. Disclosure state follows binding identity across reorder and resets when the staff, school or year changes.


### Teacher timetable agenda

The teacher timetable tab owns the full-year event collection keyed by teacher, school, selected academic year, year bounds and school time zone. Use the existing date-range query with UTC bounds covering the school's civil year, then trim and group by local start date. Reject late responses after identity changes. Date controls use `?date=YYYY-MM-DD`; legacy `week` values become date targets. Date-only navigation never invalidates the data cache. Render day groups in batches of 30 through `InfiniteList`, reveal the target before scrolling the timetable session container, and preserve all earlier groups. Keep at most one temporary empty target day. Register planning/teacher/subject invalidation and preserve existing authorization and occurrence membership.

### Report card templates in level Details

Levels and Classes → Details contains Report card templates below the level's grading settings. The collection is scoped to the selected level and workspace academic year, with multiple templates supported. Creation captures and displays that level/year as read-only; scope changes discard the open create surface. Existing template mutations and REPORT_CARD_CONFIGURE gates remain in effect. The combined navigation entry includes REPORT_CARD_CONFIGURE and there is no separate templates entry.

The Details layout owns ReportCardsPageState and its PageQuery. Template drawers use `/configuration/structure/details/report-cards/{id}`; closing returns to Details with the level selection and filters retained. Changing level or year closes the prior drawer/modal. Legacy `/configuration/report-cards` URLs redirect, retaining modal/filter context; a template deep link resolves its own level and academic year before editing. Grading scales stay separate. No persistence or report-generation behavior changes.

### Finance reads and surfaces

The Fees list, school/year overview and selected fee load independently. Billing selected charges load by ID independently of list pagination. Billing child paths `/{chargeId}/payments` and `/{chargeId}/history` share the persistent drawer header and lazily load account settlement history filtered to the selected charge. Preserve loaded detail across tab changes. Fee detail is `/finance/fees/{feeId}` with Overview default. Old fee edit/archive modal links canonicalize to that drawer while preserving filters; modal query keys remain compatible. Closing a modal restores its originating tab; closing a drawer restores the filtered parent list using route-surface history without duplicate entries.

Named reads `getFinanceOverview`, `getFeeFinanceOverview`, `getFinanceBillingPage`, `getFinancePaymentsPage`, `getFinanceBillingDetail` use trusted tenant/year/resource scopes before aggregation, count, pagination and export. Preserve fee membership through charge → service enrollment → catalog service, including cancelled enrollments. Scope summaries to PAYMENT_READ records; keep report permission for checks. Summary data errors are independent of catalog errors and never represented as zero.

Query identities include school, year, selected entity, relevant filters and authorization context. Discard stale responses and mutation drafts on workspace changes. Route-owned payment drafts retain user input after failed commands. All financial mutations invalidate affected overview, fee, billing, payment and student-finance state via the version ledger, with authoritative refresh instead of speculative financial totals. Keep existing commands/models and account invoice generation; deploy additive reads before consuming frontend changes.

## Annual and optional directory data

Annual-profile query identities include authenticated subject, school, person and academic year. Directory sidecar identities additionally include the loaded person IDs and selected column keys. Abort/stale-context guards prevent earlier requests from populating a later context. State-owned widget queries which cannot restore their state from a cached payload disable PageQuery caching. Queries batch selected optional groups and never issue a request per row. Column visibility cannot authorize a read.

Profile edits preserve omitted values and clear only explicit nulls. They must retain canonical name components, full guardian contact collections, arbitrary medical text, graduated lifecycle state and exact unmodified validity instants. Failed saves preserve the draft. Audit actors, revision/sequence counters and calculated results are server-controlled.

### Subject participation routes

The shared student Enrollments owner loads `getStudentSubjectEnrollments`; the class-subject Students route loads `getClassSubjectRoster`. Optional writes use `manageStudentSubjectEnrollments`, a stable retry request identity and expected offering revisions. The `subjectEnrollments` version key invalidates both owners. Subject mutations use URL-backed modals (`subject-selection`, `subject-roster`); the roster date is persisted as `rosterAt` in the URL.

Participation forms initialize only after their URL target has loaded, preserve unchanged timestamp boundaries when editing date-only controls, and retain drafts on roster conflicts. Bulk actions resolve eligible placements and intervals at the mutation date independently of the displayed roster date. Refresh both the roster revision and interval history after conflicts.
