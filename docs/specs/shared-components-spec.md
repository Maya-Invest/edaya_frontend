# Shared Components Spec

> **Applies to:** `apps/webapp` — reusable UI building blocks  
> **Normative:** agents and implementers **must** compose screens from this registry before adding new shared UI.

This document defines **which components to reuse**, where they live, and when to extend the registry vs. keep code feature-local.

---

## 1. Tier model

| Tier | Path | Responsibility |
|------|------|----------------|
| **T0** | `lib/components/ui/` | App-wide primitives and list/modal/gate patterns |
| **T1** | `lib/components/layout/` | Authenticated shell chrome (sidebar, header, selectors) |
| **T2** | `lib/components/school/shared/` | School-domain reusable drawer chrome, avatars, field patterns |
| **T3** | `routes/.../components/` | Route-local feature screens — list views, modals, drawer bodies for one route subtree |
| **Smart** | `lib/smart-components/` | Self-contained shared features (pickers, scope builders) — not route-bound; own state class + subcomponents |

**Rule:** New list pages, drawers, and modals **must** compose mandatory T0/T2 components. Route-specific views live under the route's `components/` folder (T3), not `lib/components/school/{domain}/`. Add a T0/T2/Smart component only when **three or more** features need the same pattern — justify in PR.

---

## 2. Mandatory registry (EDAYA UI 1.0.0)

Status: **Built** = use as-is. No **Planned** registry entries at this time — propose new T0/T2 components via §6 when criteria are met.

### 2.1 T0 — List & route

| Component | Path | Status | Use for |
|-----------|------|--------|---------|
| **BrandLogo** | `ui/BrandLogo.svelte` | Built | Official artwork, color/white tone and vertical/horizontal/symbol variants; minimum sizes and clear space |
| **PageQuery** | `ui/PageQuery.svelte` | Built | Every list route — loading contract |
| **DataState** | `ui/DataState.svelte` | Built | Loading · empty · error around collections |
| **ListPageHeader** | `ui/ListPageHeader.svelte` | Built | Page title + toolbar slots |
| **ListSearchField** | `ui/ListSearchField.svelte` | Built | Instant text filter pill — **do not** copy inline search markup |
| **FilterSelect** | `ui/filter-select.svelte` | Built | **Main filter** — always `<select>` |
| **FilterPanel** | `ui/FilterPanel.svelte` | Built | Secondary facets (status, date range) opened from Filter button |
| **ListEntityTable** | `ui/ListEntityTable.svelte` | Built | Sortable grid + selection checkboxes + infinite scroll shell |
| **ListEntityCards** | `ui/ListEntityCards.svelte` · `ListEntityCard.svelte` | Built | Card grid + sort toolbar + labeled fields + column density |
| **ListSelectionBar** | `ui/ListSelectionBar.svelte` | Built | Bulk selection bar — export + optional `actions` snippet + clear |
| **RowActionMenu** | `ui/RowActionMenu.svelte` · `RowActionMenuItem.svelte` | Built | Simple-entity row `···` → edit / delete modals |

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
| **AcademicYearSelector** | `layout/AcademicYearSelector.svelte` | Sidebar year selection beneath school; collapsed calendar trigger and mobile navigation |
| **AcademicPeriodSelector** | `layout/AcademicPeriodSelector.svelte` | Shared term context beside affected page/tab/action content; persistent label, dated options and empty-year state |
| **ClassSelector** | `layout/ClassSelector.svelte` | Class context in Classes module |

Feature routes **do not** reimplement shell chrome.

### 2.4 T2 — Drawer stack

| Component | Path | Status | Use for |
|-----------|------|--------|---------|
| **DetailDrawer shell contract** | Shared `school/shared/DetailDrawer.svelte` or route-local `[[id]]/+layout.svelte` shell | Built / route-local | Overlay shell — type chip, close, backdrop/Escape close, `md:w-1/2`, lazy or routed body dispatch |
| **DrawerEntityHeader** | `school/shared/DrawerEntityHeader.svelte` | Built | Identity + ≤2 primary actions + overflow |
| **DrawerField** | `school/shared/DrawerField.svelte` | Built | Read-only label + value in drawer body |
| **DrawerEmptyState** | `school/shared/DrawerEmptyState.svelte` | Built | Empty sub-collection / tab placeholder |
| **DrawerActionBar** | `school/shared/DrawerActionBar.svelte` | Built | Optional drawer **body footer** — `border-t`, right-aligned actions; **not** sub-collection `+ Add` header |

Complex drawer bodies (`*Detail.svelte`, `*Tabs.svelte`, nested tab routes) **must** use `DrawerEntityHeader` for identity and actions — not a duplicate hero block in tab content. Nested-route drawers may own a route-local shell when the shared dispatcher would couple the route back to legacy feature bodies.

### 2.5 Smart components (pickers & scope UI)

Smart components are shared, self-contained features with their own state class — see route-state spec §8. They live in `lib/smart-components/`, not under route folders.

| Component | Path | Use for |
|-----------|------|---------|
| **PersonPicker** | `smart-components/person-picker/` (target) · legacy `school/shared/pickers/PersonPicker.svelte` | Base searchable person popover |
| **StaffPicker** | `smart-components/staff-picker/` (target) · legacy `school/shared/pickers/StaffPicker.svelte` | Homeroom, staff assignment targets |
| **StudentPicker** | `smart-components/student-picker/` (target) · legacy `school/shared/pickers/StudentPicker.svelte` | Incidents, billing, enrollments |
| **ClassGroupPicker** | `smart-components/class-group-picker/` | Activity class timetable links, class multi-select on create |
| **GuardianPicker** | `smart-components/guardian-picker/` (target) · legacy `school/shared/pickers/GuardianPicker.svelte` | Guardian ↔ student linking |
| **ScopeBuilder** | `smart-components/scope-builder/` (target) · legacy `school/configuration/ScopeBuilder.svelte` | Staff permission typed `scopes` by catalog grain |
| **StaffPermissionFormModal** | route-local or smart — legacy `school/configuration/StaffPermissionFormModal.svelte` | Add / edit `staffPermissionAssignments` |

Do not build ad-hoc `<select>` lists for people — use pickers or **PickerModal**. New smart components follow `*-state.svelte.ts` + root `.svelte` + `components/` subfolder.

### 2.6 T2 — Authorization UI (legacy paths)

| Component | Path | Use for |
|-----------|------|---------|
| **PermissionCheckboxGroup** | `school/configuration/PermissionCheckboxGroup.svelte` | **Staff assignment** create/edit forms only — pick permission codes authorized directly by a class-level assignment; **not** the Permissions tab list |

**Do not** use `ScopeBuilder` outside staff permission and permission-profile apply flows. A same-grain **profile checklist catalog** at `/configuration/permission-profiles` is allowed. **Do not** restore a roles CRUD matrix screen.

### 2.7 T2 — Identity

| Component | Path | Use for |
|-----------|------|---------|
| **PersonAvatar** | `school/shared/PersonAvatar.svelte` | Staff, guardians |
| **StudentAvatar** | `school/shared/StudentAvatar.svelte` | Published student portrait only (headers, lists, switchers) |
| **ProfilePhotoPicker** | `school/shared/ProfilePhotoPicker.svelte` | Crop/rotate JPEG export under 1 MiB. Staff and guardian self-photos publish immediately; student portraits use the Profile review card |

### 2.8 Shared modules (not components)

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

Inside route-local `*View.svelte` (T3):

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
DetailDrawer shell (shared or route-local)
  DrawerEntityHeader — avatar, name, chips, [Action 1] [Action 2] [···]
  body:
    tab bar: route links under [[id]]/ (e.g. …/guardians) — not ?tab= query params
    sections: DrawerField …
    sub-collection: inline section header (+ Add) + read-only list + row Edit/Delete → modals
    optional footer: DrawerActionBar (secondary actions only)
    empty: DrawerEmptyState
```

Route-local drawer shells must still implement the T2 shell contract: type chip + close-only shell header, backdrop click, Escape close, list-preserving overlay, full-width mobile, `md:w-1/2` desktop width, and no footer unless it contains Close only.

### 3.3 Simple entity

No drawer route required. **RowActionMenu** is the primary mutation surface (simple entities: row `···` only, no URL-backed drawer).

---

## 4. Feature-local patterns (not yet extracted)

These remain route-local (T3) or legacy until migrated. Follow visual patterns from the design-language spec.

| Pattern | Current location | Target |
|---------|------------------|--------|
| **Drawer tab navigation** | Feature-local tab bars in routed drawer layouts | **Nested child routes** under `[[id]]/`; tab bars render route links. The callback-based `DrawerTabBar` primitive is removed and must not be restored. |
| **Entity table / card list** | `ui/ListEntityTable.svelte` + `ui/ListEntityCards.svelte` + route snippets | Built — students list uses both views |
| **Chip-bar main filter (legacy)** | Some older views in `lib/components/school/` | Migrate to `FilterSelect` + `FilterPanel` when touching the file |
| **Feature views in lib** | Legacy `lib/components/school/{domain}/` | Colocate under `routes/.../components/` per route-state spec |

---

## 5. Registry history (completed extractions)

| ID | Component | Status | Notes |
|----|-----------|--------|-------|
| P0.1 | `DrawerEntityHeader` | Built | Required on all complex drawer bodies |
| P0.2 | `ListSearchField` | Built | Replace inline search markup in views |
| P0.3 | `FilterPanel` | Built | Secondary filters behind Filter button |
| P0.4 | `RowActionMenu` | Built | Primary surface for simple entities |

Remaining chip-bar **main** filters should migrate to `FilterSelect` when touched — not blocking.

---

## 6. Anti-patterns

| Do not | Do instead |
|--------|------------|
| Copy search input markup into each `*View` | `ListSearchField` |
| Chip bar or pill toggle as **main** filter | `FilterSelect` + `FilterPanel` |
| Identity block + actions only in drawer body tabs | `DrawerEntityHeader` |
| Open `*Form.svelte` as default drawer body | Read-only body + `FormModal` |
| Custom permission matrix / inline CRUD grid | Staff drawer + `StaffPermissionFormModal`; profile catalog uses a same-grain checklist, not a roles matrix |
| Raw `<select>` for staff/student/guardian | Smart `*Picker` or `PickerModal` |
| New `ScopeChipSelector` usages | `ScopeBuilder` or delete unused legacy |
| One-off badge colors | `ui-tones` / `drawer-constants` |
| Feature views in `lib/components/school/{domain}/` | `routes/.../components/` |
| `?tab=` query param for drawer tabs | Nested routes under `[[id]]/` |

---

## 7. When to add a new shared component

1. Same UI pattern appears in **≥3** features or **≥2** modules.
2. Pattern is stable (not a one-off experiment).
3. Add to this registry in the **same PR** as the component.
4. If route-only, keep in `routes/.../components/` (T3) with no registry entry.
5. If shared self-contained feature (picker, scope builder), add under `lib/smart-components/` per route-state spec §8.

---

## 8. Agent checklist

When building or refactoring a screen:

- [ ] List uses `ListPageHeader` + `FilterSelect` + `ListSearchField` / `FilterPanel` as needed
- [ ] Route uses `PageQuery` + `DataState`
- [ ] Mutations use `FormModal` / `ConfirmModal` / `PickerModal`
- [ ] Actions wrapped in `PermissionGate` where required
- [ ] Complex drawer uses the DetailDrawer shell contract + `DrawerEntityHeader` + `DrawerField`
- [ ] Sub-collections use inline section header for `+ Add`; `DrawerEmptyState` for empty tabs
- [ ] Route-local views in `routes/.../components/` — not `lib/components/school/{domain}/`
- [ ] Drawer tabs use nested child routes — not `?tab=` query params
- [ ] People selection uses smart `*Picker` family
- [ ] Staff permissions use `ScopeBuilder` + `StaffPermissionFormModal` only
- [ ] Status chips use `ui-tones` / `drawer-constants`
- [ ] No new shared component without registry update (§2)

---

## Document history

| Date | Change |
|------|--------|
| 2026-08-12 | Removed callback-based `DrawerTabBar`; route-link tab bars are the replacement |
| 2026-07-06 | §4 feature-local patterns; DrawerTabBar / EntityTable guidance; registry cleanup |
| 2026-07-06 | DrawerActionBar = body footer; PermissionCheckboxGroup scope |
| 2026-07-03 | Initial registry — T0/T1/T2 tiers, mandatory components |

### Small-screen shell and tables

`AppSidebar.forceExpanded` is a presentation override used by the mobile staff navigation dialog; desktop expansion preferences remain in the existing shell state. `ListEntityTable` keeps its twelve-column layout inside a focusable horizontal scroll region with a 48rem minimum content width. Preserve all columns, sort/selection controls, row actions and infinite loading.

`AccountProfileModal` uses the existing `Dialog` primitive with a bounded flex column: header and footer do not shrink, and the middle profile content scrolls. Close and sign-out actions must stay reachable on short viewports and with enlarged text. Preserve profile fields, photo permissions, shortcuts and the existing logout callback.

## Passwordless authentication

`PasswordlessPanel` is shared by login, signup, invitations and Account security. It owns one contact field with automatic email/international-phone detection and validation, user-triggered resend and SMS switching after server cooldown, OTP, authenticator verification/enrollment and one-time recovery-code display through `PasswordlessFlow`. Use existing Button/Input/Label primitives and ConfirmModal for identifier removal. No auth-provider SDK belongs in UI components.

`TestOtpPanel` is shared by login and contact linking through `PasswordlessPanel`. The `$testOtpPanel` build alias resolves to an empty component unless `PUBLIC_TEST_OTP_ACCESS=true`. The enabled component discovers server capabilities once, reveals only after an explicit **Show test code** action, labels the panel as testing, and offers **Copy** without filling or submitting the form. It clears transient codes and ignores late responses after replacement, expiry, completion, reset, unmount or backgrounding. Code content carries `data-sensitive` so integration captures mask it. Normal deploy commands explicitly disable the flag.

`/login/demo` retains the development-only staff account picker. Choosing a fixture account only prefills `PasswordlessPanel`; sending and verifying its OTP, optional authenticator steps, resend and testing controls use the existing flow. Choosing another account unmounts the panel and clears its transient challenge. No password or automatic sign-in is used by the picker.

Identity advertises phone availability. Until discovery succeeds with phone available, authentication and contact-linking forms display email-only labels, omit phone choices and country hints, and reject pasted phone identifiers locally with translated feedback. Discovery failures fail closed to email-only; phone controls return when availability is explicitly restored. Email OTP, authenticator verification/enrollment and recovery remain available.

## Correction review controls

Correction lists use ListPageHeader, FilterSelect, FilterPanel, PageQuery and DataState. Correction detail uses the shared accessible Dialog drawer and FormModal for rejection/consequence confirmation. Structured logbook content, objectives, homework, family summary and progress render as individual differences; use subject/chapter/student names instead of internal identifiers.
