# Svelte State Alignment — Sprint Plan

> **ARCHIVED** 2026-07-06 — Superseded by [demo-ready-plan.md](../demo-ready-plan.md). Kept for history. P1/P2 state extractions remain on-touch only.

> **Normative contract:** [svelte-state-spec.md](../../specs/svelte-state-spec.md)  
> **Pairs with:** [data-loading-spec.md](../../specs/data-loading-spec.md) · [data-loading-sprint.md](../../specs/data-loading-sprint.md)

> **Status:** **SS Phases 0–4 complete** (2026-07-06) — P1/P2 feature states remain on-touch

---

## Current gap summary

| Area | Today | Target |
|------|-------|--------|
| Feature state modules | **5** P0 `*-state.svelte.ts` files | Tier-2 classes for complex screens ✅ P0 done |
| `.svelte.ts` modules | Tier-1 singletons + `ListFiltersState` + feature states | ✅ |
| List views (33 `*View.svelte`) | Pilots on `ListFiltersState`; ~17 views still inline | Roll out on touch |
| Context wiring | Symbol keys for drawer + planning timetable | ✅ |
| Component scripts | P0 views thinned | P1/P2 on touch |
| Data loading | Entity store + `PageQuery` | ✅ |

**Principle:** migrate incrementally on touch — no big-bang rewrite. New screens must follow the spec from day one.

---

## Status legend

| Tag | Meaning |
|-----|---------|
| ✅ | Matches spec |
| ⚠️ | Partial — works, refactor when touched |
| ❌ | Known violation — prioritize |
| — | Not started |

---

## Tier 1 — Session singletons (audit only)

Existing modules are **acceptable**; no mass rename `*Context` → `*State`.

| Module | Status | Notes |
|--------|--------|-------|
| `detail-data/context.svelte.ts` | ✅ | Entity store — do not split into feature state |
| `academic/context.svelte.ts` | ✅ | Shell selectors |
| `auth/session.svelte.ts` | ✅ | Session |
| `shell/context.svelte.ts` | ✅ | Chrome |
| `onboarding/context.svelte.ts` | ✅ | Draft persistence; wizard orchestration in `onboarding-wizard-state.svelte.ts` |
| `report-cards/context.svelte.ts` | ✅ | Domain store |
| `teaching-log/context.svelte.ts` | ✅ | Domain store |
| `session-detail/context.svelte.ts` | ✅ | Session drawer cache |
| `discipline-catalog/context.svelte.ts` | ✅ | Small domain store |
| `drawer.svelte.ts` | ✅ | Symbol context via `drawer-context.ts` |

---

## Phase 0 — Guardrails (1 PR)

**Goal:** Agents and reviewers know the rules; no runtime changes.

- [x] `docs/specs/svelte-state-spec.md`
- [x] `.cursor/rules/svelte-state.mdc`
- [x] Link in `AGENTS.md`
- [x] State-action unit tests for entity store, queries, mutations (Phase T — [backend-alignment-plan](./backend-alignment-plan.md))
- [x] Add § "State alignment" checklist to [ui-architecture-reference.md](../reference/ui-architecture-reference.md) §0
- [ ] PR template / review note: new `*View.svelte` > 60 lines script → justify or extract state

**Exit:** Spec linked; checklist in reference doc.

---

## Phase 1 — Shared list filter primitive (1–2 PRs)

**Goal:** Remove duplicated URL ↔ local filter boilerplate from list views.

### Problem

~20 views repeat the same pattern:

- `read*ListFilters` / `write*ListFilters`
- `q`, `filtersReady`, debounced `syncFiltersToUrl`
- `$effect` hydrating from URL

### Deliverable

- [x] `lib/list/list-filters-state.svelte.ts`

Or a factory: `createListFiltersState(read, write, debounceMs?)`.

### Pilot migrations (then roll out)

| View | Status |
|------|--------|
| `FeesView.svelte` | ✅ |
| `StudentsView.svelte` | ✅ |
| `PaymentsView.svelte` | ✅ |

### Remaining views (batch by module)

School · Classes · Finance · School-life · Configuration · Scheduling

**Exit:** 3 pilots merged; pattern documented in spec appendix; remaining views tagged ⚠️ in table below.

---

## Phase 2 — Context normalization (1 PR)

**Goal:** Consistent `set*` / `get*` + Symbol keys.

| Item | Status | Action |
|------|--------|--------|
| `DrawerState` | ✅ | `drawer-context.ts` Symbol key |
| `ClassTimetableCalendar` inline context | ✅ | `planning-timetable-state.svelte.ts` |
| `SvarCalendarLocale` `wx-i18n` | — | Third-party; leave as-is |

**Exit:** No new string context keys; calendar context extracted.

---

## Phase 3 — Feature state classes (priority order)

Extract **only** when a screen has orchestration across siblings or >~80 lines of non-UI script logic.

### P0 — High complexity

| Feature | Files | Proposed module | Status |
|---------|-------|-----------------|--------|
| **Planning / timetable** | `PlanningView`, `ClassTimetableCalendar`, … | `lib/scheduling/planning-state.svelte.ts` | ✅ |
| **School students list** | `SchoolStudentsView` | `lib/students/school-students-state.svelte.ts` | ✅ |
| **Onboarding wizard** | `onboarding/+page.svelte` | `onboarding-wizard-state.svelte.ts` | ✅ |
| **Teachers directory** | `TeachersView` | `lib/school/teachers-state.svelte.ts` | ✅ |

### P1 — Medium complexity

| Feature | Files | Proposed module | Status |
|---------|-------|-----------------|--------|
| **Staff assignment modal** | `StaffAssignmentFormModal` (5× `$effect`) | `staff-assignment-form-state.svelte.ts` | — |
| **Scope builder** | `ScopeBuilder.svelte` | `scope-builder-state.svelte.ts` | — |
| **Educator dashboard** | `EducatorDashboardView` | `educator-dashboard-state.svelte.ts` | — |

### P2 — On touch

Remaining `*View.svelte` files — extract only if adding features would push script past threshold.

**Exit per feature:** Component script mostly `get*State()`, `$derived` from store, modal booleans; unit tests on state class where logic is non-trivial.

---

## Phase 4 — Data-loading boundary audit (ongoing)

Feature state must **not** duplicate entity arrays. Cross-check with [data-loading-sprint.md](./data-loading-sprint.md).

| Check | Status |
|-------|--------|
| `SchoolStudentsView` seeds store inside infinite fetcher | ⚠️ OK for pagination; document as exception |
| No new `$effect` + API fetch in views | ✅ grep audit 2026-07-06 |
| `useCursorInfiniteList` initial fetch in `$effect` | ⚠️ Acceptable in list helper; prefer route seed when API supports it |

**Action:** Close data-loading-sprint item "Audit components that `$effect`-fetch" as part of Phase 4.

---

## List view inventory

| View | Filter boilerplate | Feature state needed | Status |
|------|-------------------|---------------------|--------|
| `SchoolStudentsView` | ⚠️ duplicate | P0 | — |
| `StudentsView` | ⚠️ duplicate | P2 | — |
| `GuardiansView` | ⚠️ duplicate | P2 | — |
| `StaffView` | ⚠️ duplicate | P2 | — |
| `PlanningView` | ⚠️ duplicate + week nav | P0 | — |
| `FeesView` | ⚠️ duplicate | Phase 1 pilot | — |
| `PaymentsView` | ⚠️ duplicate | Phase 1 pilot | — |
| `EvaluationsView` | ⚠️ | P2 | — |
| `ClassReportCardsView` | ⚠️ | P2 | — |
| `AnnouncementsView` | ⚠️ | P2 | — |
| `AttendanceView` | ⚠️ | P2 | — |
| `DisciplinaryCatalogView` | ⚠️ | P2 | — |
| `GradeScalesView` | ⚠️ | P2 | — |
| `ClassGroupsView` | ⚠️ | P2 | — |
| `EducatorDashboardView` | ⚠️ | P1 | — |
| `TeachingLogView` | — | P2 | — |
| `DirectorDashboardView` | — | — | ✅ thin |
| `FinanceView` | — | — | ✅ shell only |
| `HomeworkView` | — | — | legacy redirect |
| `ResourcesView` | ⚠️ | post-v1 | — |

---

## Out of scope

- Renaming all `*Context` → `*State`
- Moving entity store out of `detailDataContext`
- Replacing `runMutation` / `PageQuery` patterns
- Modal form state for simple CRUD modals (< 3 effects, no cross-field orchestration)

---

## Success criteria

1. **New code** follows [svelte-state-spec.md](../specs/svelte-state-spec.md) (enforced by cursor rule).
2. **Phase 1** shared filter helper used by all primary list routes.
3. **P0 feature states** extracted for planning, school students, onboarding.
4. **No regression** — `bun --filter webapp test` + smoke key routes.
5. **Tracker** updated in same PR as each migration.

---

## Suggested execution order

```
Phase 0 (done) → Phase 1 pilots → Phase 2 context → Phase 3 P0 (planning first)
     ↓
Phase 3 P1 → batch Phase 1 remaining views → Phase 4 audit
```

**Estimate:** Phase 0–2 ~2–3 PRs; Phase 3 P0 ~3 PRs; full list filter rollout ~2–4 PRs alongside feature work.

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-05 | Initial alignment plan |
