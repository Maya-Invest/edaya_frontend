# Shared Components Spec

> **Applies to:** `apps/webapp` — reusable UI building blocks  
> **Normative:** agents and implementers **must** compose screens from this registry before adding new shared UI.  
> **Companion specs:**
> - [v1-feature-architecture-spec.md](./v1-feature-architecture-spec.md) — *what* to build (routes, entities, locked UX)
> - [app-shell-spec.md](./app-shell-spec.md) — list · drawer · modal *patterns*
> - [design-language-spec.md](./design-language-spec.md) — *how components look* (tokens, typography)
> - [data-loading-spec.md](./data-loading-spec.md) — `PageQuery` · entity store · mutations

This document defines **which components to reuse**, where they live, and when to extend the registry vs. keep code feature-local.

---

## 1. Tier model

| Tier | Path | Responsibility |
|------|------|----------------|
| **T0** | `lib/components/ui/` | App-wide primitives and list/modal/gate patterns |
| **T1** | `lib/components/layout/` | Authenticated shell chrome (sidebar, header, selectors) |
| **T2** | `lib/components/school/shared/` | School-domain reusable patterns (drawer chrome, pickers, avatars) |
| **T3** | `lib/components/school/{domain}/` | Feature screens — **compose T0–T2**; do not fork shared patterns |

**Rule:** New list pages, drawers, and modals **must** use mandatory T0/T2 components below. Add a T0/T2 component only when **three or more** features need the same pattern — justify in PR.

---

## 2. Mandatory registry (v1)

Status: **Built** = use as-is · **Planned** = specified here; extract or implement in Phase 0

### 2.1 T0 — List & route

| Component | Path | Status | Use for |
|-----------|------|--------|---------|
| **PageQuery** | `ui/PageQuery.svelte` | Built | Every list route — loading contract ([data-loading-spec](./data-loading-spec.md)) |
| **DataState** | `ui/DataState.svelte` | Built | Loading · empty · error around collections |
| **ListPageHeader** | `ui/ListPageHeader.svelte` | Built | Page title + toolbar slots ([app-shell §2](./app-shell-spec.md#2-list-page-template)) |
| **ListSearchField** | `ui/ListSearchField.svelte` | Planned | Instant text filter pill — **do not** copy inline search markup |
| **FilterSelect** | `ui/filter-select.svelte` | Built | **Main filter** — always `<select>` |
| **FilterPanel** | `ui/FilterPanel.svelte` | Planned | Secondary facets (status, date range) opened from Filter button |
| **ListMoreMenu** | `ui/ListMoreMenu.svelte` | Built | Export stub · view toggle · bulk placeholders |
| **RowActionMenu** | `ui/RowActionMenu.svelte` | Planned | Simple-entity row `···` → edit / delete modals |

### 2.2 T0 — Mutations & feedback

| Component | Path | Status | Use for |
|-----------|------|--------|---------|
| **FormModal** | `ui/FormModal.svelte` | Built | Create / edit — Cancel + Save |
| **ConfirmModal** | `ui/ConfirmModal.svelte` | Built | Delete / irreversible — Cancel + Confirm |
| **PickerModal** | `ui/PickerModal.svelte` | Built | Link / assign related entity |
| **PermissionGate** | `ui/PermissionGate.svelte` | Built | Hide or disable actions by effective grant |
| **DeleteEntityButton** | `ui/DeleteEntityButton.svelte` | Built | Standard destructive control in modals / overflow |
| **ToastHost** | `ui/ToastHost.svelte` | Built | Global mutation feedback (via `toast` helper) |

Use **Button**, **Input**, **Label**, **Checkbox**, **Select**, **Dialog**, **Popover**, **Textarea** from `ui/` for form fields — not raw unstyled HTML (except inside `FilterSelect`).

### 2.3 T1 — Shell

| Component | Path | Use for |
|-----------|------|---------|
| **AppSidebar** | `layout/AppSidebar.svelte` | Module navigation |
| **AcademicHeader** | `layout/AcademicHeader.svelte` | School · year/period · language · user menu |
| **ClassSelector** | `layout/ClassSelector.svelte` | Class context in Classes module |

Feature routes **do not** reimplement shell chrome.

### 2.4 T2 — Drawer stack

| Component | Path | Status | Use for |
|-----------|------|--------|---------|
| **DetailDrawer** | `school/shared/DetailDrawer.svelte` | Built | Overlay shell — type chip, close, lazy body dispatch |
| **DrawerEntityHeader** | `school/shared/DrawerEntityHeader.svelte` | Planned | Identity + ≤2 primary actions + overflow ([app-shell §3.1](./app-shell-spec.md#31-anatomy)) |
| **DrawerField** | `school/shared/DrawerField.svelte` | Built | Read-only label + value in drawer body |
| **DrawerEmptyState** | `school/shared/DrawerEmptyState.svelte` | Built | Empty sub-collection / tab placeholder |
| **DrawerActionBar** | `school/shared/DrawerActionBar.svelte` | Built | Section header + `+ Add …` CTA |

Complex drawer bodies (`*Detail.svelte`, `*Tabs.svelte`) **must** use `DrawerEntityHeader` for identity and actions — not a duplicate hero block in tab content.

### 2.5 T2 — Identity & pickers

| Component | Path | Use for |
|-----------|------|---------|
| **PersonAvatar** | `school/shared/PersonAvatar.svelte` | Staff, guardians |
| **StudentAvatar** | `school/shared/StudentAvatar.svelte` | Students (photo overlay on edit) |
| **ProfilePhotoPicker** | `school/shared/ProfilePhotoPicker.svelte` | Avatar upload in edit modals |
| **PersonPicker** | `school/shared/pickers/PersonPicker.svelte` | Base searchable person popover |
| **StaffPicker** | `school/shared/pickers/StaffPicker.svelte` | Homeroom, staff assignment targets |
| **StudentPicker** | `school/shared/pickers/StudentPicker.svelte` | Incidents, billing, enrollments |
| **GuardianPicker** | `school/shared/pickers/GuardianPicker.svelte` | Guardian ↔ student linking |

Do not build ad-hoc `<select>` lists for people — use pickers or **PickerModal**.

### 2.6 T2 — Authorization UI

| Component | Path | Use for |
|-----------|------|---------|
| **ScopeBuilder** | `school/configuration/ScopeBuilder.svelte` | Staff permission `scopeIds` by catalog grain ([v1 §5.3.1](./v1-feature-architecture-spec.md#531-staff-permission-assignment-ui)) |
| **StaffPermissionFormModal** | `school/configuration/StaffPermissionFormModal.svelte` | Add / edit `staffPermissionAssignments` |
| **PermissionCheckboxGroup** | `school/configuration/PermissionCheckboxGroup.svelte` | Staff **assignment** form — pick permissions to sync |

**Do not** use `ScopeBuilder` outside staff permission flows. **Do not** restore a roles CRUD matrix screen.

### 2.7 Shared modules (not components)

| Module | Path | Use for |
|--------|------|---------|
| **ui-tones** | `lib/ui-tones.ts` | Badge / surface tone class strings |
| **drawer-constants** | `school/shared/drawer-constants.ts` | Status → tone maps, kind labels |

---

## 3. Composition recipes

### 3.1 List route (complex or simple entity)

```svelte
<PageQuery {query} loadingTitle={$t('…')}>
  {#snippet children(data)}
    <DataState status={data.status} …>
      <EntityView />
    </DataState>
  {/snippet}
</PageQuery>
```

Inside `*View.svelte`:

```
ListPageHeader
  search:   ListSearchField bind:value={query}
  filters:  FilterSelect (main) + FilterPanel trigger (secondary)
  more:     ListMoreMenu
  primary:  Button → EntityFormModal
EntityTable | EntityCardList   ← collection wrapper (feature-local OK for now)
  complex:  row click → navigate …/[[id]]
  simple:   RowActionMenu → FormModal | ConfirmModal
```

### 3.2 Complex drawer

```
DetailDrawer (shell)
  DrawerEntityHeader — avatar, name, chips, [Action 1] [Action 2] [···]
  body:
    DrawerTabs? (feature-local pill strip until extracted)
    sections: DrawerField …
    sub-collection: DrawerActionBar + read-only list + row Edit/Delete → modals
    empty: DrawerEmptyState
```

### 3.3 Simple entity

No drawer route required. **RowActionMenu** is the primary mutation surface ([app-shell §3.5](./app-shell-spec.md#35-simple-entities-no-drawer)).

---

## 4. Planned extractions (Phase 0)

| ID | Component | Replaces |
|----|-----------|----------|
| P0.1 | `DrawerEntityHeader` | Per-drawer identity heroes and footer action bars |
| P0.2 | `ListSearchField` | ~15 inline `rounded-full pl-9` search inputs |
| P0.3 | `FilterPanel` | Ad-hoc popover filter panels and chip bars |
| P0.4 | `RowActionMenu` | Per-view `···` popover duplication |

Track in [v1-staff-webapp-implementation-plan.md](../sprints/v1-staff-webapp-implementation-plan.md) Phase 0.

---

## 5. Anti-patterns

| Do not | Do instead |
|--------|------------|
| Copy search input markup into each `*View` | `ListSearchField` |
| Chip bar or pill toggle as **main** filter | `FilterSelect` + `FilterPanel` |
| Identity block + actions only in drawer body tabs | `DrawerEntityHeader` |
| Open `*Form.svelte` as default drawer body | Read-only body + `FormModal` |
| Custom permission matrix / inline CRUD grid | Staff drawer + `StaffPermissionFormModal` |
| Raw `<select>` for staff/student/guardian | `*Picker` or `PickerModal` |
| New `ScopeChipSelector` usages | `ScopeBuilder` or delete unused legacy |
| One-off badge colors | `ui-tones` / `drawer-constants` |

---

## 6. When to add a new shared component

1. Same UI pattern appears in **≥3** features or **≥2** modules.
2. Pattern is stable (not a one-off experiment).
3. Add to this registry in the **same PR** as the component.
4. If feature-only, keep in T3 (`school/{domain}/`) with no registry entry.

---

## 7. Agent checklist

When building or refactoring a screen:

- [ ] List uses `ListPageHeader` + `FilterSelect` (+ `ListSearchField` / `FilterPanel` when landed)
- [ ] Route uses `PageQuery` + `DataState` ([data-loading-spec](./data-loading-spec.md))
- [ ] Mutations use `FormModal` / `ConfirmModal` / `PickerModal`
- [ ] Actions wrapped in `PermissionGate` where required
- [ ] Complex drawer uses `DetailDrawer` + `DrawerEntityHeader` + `DrawerField`
- [ ] Sub-collections use `DrawerActionBar` + `DrawerEmptyState`
- [ ] People selection uses `*Picker` family
- [ ] Staff permissions use `ScopeBuilder` + `StaffPermissionFormModal` only
- [ ] Status chips use `ui-tones` / `drawer-constants`
- [ ] No new shared component without registry update (§2)

---

## 8. Related specs

| Topic | Spec |
|-------|------|
| Interaction rules | [app-shell-spec.md](./app-shell-spec.md) |
| Visual tokens & typography | [design-language-spec.md](./design-language-spec.md) §9 (visual catalog) |
| Routes & entities | [v1-feature-architecture-spec.md](./v1-feature-architecture-spec.md) |
| Permission assignment UX | [v1-feature-architecture-spec.md §5.3.1](./v1-feature-architecture-spec.md#531-staff-permission-assignment-ui) |

---

## Document history

| Date | Change |
|------|--------|
| 2026-07-03 | Initial registry — T0/T1/T2 tiers, v1 mandatory dozen, Phase 0 planned extractions |
