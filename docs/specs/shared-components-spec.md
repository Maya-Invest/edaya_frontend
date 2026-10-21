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
| **ListPageHeader** | `ui/ListPageHeader.svelte` | Built | Page title + toolbar slots; `level="section"` uses a compact h3 inside an existing page hierarchy |
| **ListSearchField** | `ui/ListSearchField.svelte` | Built | Instant text filter pill — **do not** copy inline search markup |
| **FilterSelect** | `ui/filter-select.svelte` | Built | **Main filter** — always `<select>` |
| **FilterPanel** | `ui/FilterPanel.svelte` | Built | Secondary facets (status, date range) opened from Filter button |
| **InfiniteList** | `ui/InfiniteList.svelte` | Built | Scroll-triggered batch loading and end-of-list feedback; route state owns requests and retry |
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
| **DetailDrawer shell contract** | Route-local `[[id]]/+layout.svelte` shell | Built / route-local | Overlay shell — type chip, close, backdrop/Escape close, `md:w-1/2`, lazy or routed body dispatch |
| **DrawerEntityHeader** | `school/shared/DrawerEntityHeader.svelte` | Built | Identity + ≤2 primary actions + overflow |
| **DrawerField** | `school/shared/DrawerField.svelte` | Built | Read-only label + value in drawer body |
| **DrawerEmptyState** | `school/shared/DrawerEmptyState.svelte` | Built | Empty sub-collection / tab placeholder |

Complex drawer bodies (`*Detail.svelte`, `*Tabs.svelte`, nested tab routes) **must** use `DrawerEntityHeader` for identity and actions — not a duplicate hero block in tab content. Nested-route drawers may own a route-local shell when the shared dispatcher would couple the route back to legacy feature bodies.

### 2.5 Smart components (pickers & scope UI)

Smart components are shared, self-contained features with their own state class — see route-state spec §8. They live in `lib/smart-components/`, not under route folders.

| Component | Path | Use for |
|-----------|------|---------|
| **PersonPicker** | `smart-components/person-picker/` | Base searchable person popover |
| **StaffPicker** | `smart-components/staff-picker/` | Homeroom, staff assignment targets |
| **StudentPicker** | `smart-components/student-picker/` | Incidents, billing, enrollments |
| **ClassGroupPicker** | `smart-components/class-group-picker/` | Activity class timetable links, class multi-select on create |
| **GuardianPicker** | `smart-components/guardian-picker/` | Guardian ↔ student linking |
| **PermissionResolutionPreview** | `components/school/` | Added/changed/removed grant scopes and persistent resolution warnings before save. All four permission forms use shared `PermissionImpactPreviewState` to bind review to the complete current command and active session; outdated responses cannot publish a report or enable Save. |
| **PermissionScopeTypes** | `smart-components/scope-builder/` | Presentational scope-type badges reused by profile configuration, staff permission lists and manual permission editing. Uses catalog metadata and the scope picker mapping, existing neutral badge tokens, localized labels and wrapping layout. |
| **PermissionScopeSelections** | `smart-components/scope-builder/` | Mixed selection groups; no automatic broad selection |
| **ScopeBuilder** | `smart-components/scope-builder/` | Typed scope selection groups for staff permissions, profile assignments and staff defaults |
| **AccountLinkingSection** | `smart-components/account-linking/` | Staff, guardian and student invitation workflow with actor-scoped state |
| **PasswordlessPanel** | `smart-components/passwordless-panel/` | Login, signup, invitations and security; transient authentication state |
| **TestOtpPanel** | `smart-components/test-otp-panel/` | Build-gated testing controls with stale-response and visibility guards |
| **StaffPermissionFormModal** | `smart-components/staff-permission-form-modal/` | Add / edit `staffPermissionAssignments` |

Do not build ad-hoc `<select>` lists for people — use pickers or **PickerModal**. New smart components follow `*-state.svelte.ts` + root `.svelte` + `components/` subfolder.

### 2.6 Route-owned authorization UI

| Component | Path | Use for |
|-----------|------|---------|
| **PermissionCheckboxGroup** | `routes/(app)/configuration/structure/classes/components/PermissionCheckboxGroup.svelte` | **Staff assignment** create/edit forms only — pick permission codes authorized directly by a class-level assignment; **not** the Permissions tab list |

**Do not** use `ScopeBuilder` outside staff permission, permission-profile assignment and staff default-scope flows. A mixed-permission **profile checklist catalog** at `/configuration/permission-profiles` is allowed. **Do not** restore a roles CRUD matrix screen.

### 2.7 T2 — Identity

| Component | Path | Use for |
|-----------|------|---------|
| **PersonAvatar** | `school/shared/PersonAvatar.svelte` | Staff, guardians |
| **StudentAvatar** | `school/shared/StudentAvatar.svelte` | Published student portrait only (headers, lists, switchers) |
| **ProfilePhotoPicker** | `school/shared/ProfilePhotoPicker.svelte` | Crop/rotate JPEG export under 1 MiB. Staff and guardian self-photos publish immediately; student portraits use the Profile review card |

Private portrait previews resolve an authorized download grant before fetching image bytes. Downloads served by the same API under `/core/files/` retain bearer authentication and reject redirects; external object-storage downloads omit account credentials. A denied grant or download must not fall back to an unauthenticated request.

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
| Custom permission matrix / inline CRUD grid | Staff drawer + `StaffPermissionFormModal`; profile catalog uses a mixed-permission checklist, not a roles matrix |
| Raw `<select>` for staff/student/guardian | Smart `*Picker` or `PickerModal` |
| Ad-hoc scope chip selectors | `ScopeBuilder` |
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
- [ ] Staff permissions use `PermissionScopeSelections` + `ScopeBuilder` in the standard assignment/default modals
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

`PasswordlessPanel` is shared by login, signup, invitations and Account security. It owns one contact field with automatic email/international-phone detection and validation, user-triggered resend and SMS switching after server cooldown, OTP, authenticator verification/enrollment and one-time recovery-code display through its colocated `PasswordlessPanelState`. Authentication requests and completion belong to this smart workflow state. Use existing Button/Input/Label primitives and ConfirmModal for identifier removal. No auth-provider SDK belongs in UI components.

`TestOtpPanel` is shared by login and contact linking through `PasswordlessPanel`. The `$testOtpPanel` build alias resolves to an empty component unless `PUBLIC_TEST_OTP_ACCESS=true`. The repository development command supplies this flag by default and respects an explicit shell override of `false`; the backend must also advertise capture support. The enabled component discovers server capabilities once, reveals only after an explicit **Show test code** action, labels the panel as testing, and offers **Copy** without filling or submitting the form. It clears transient codes and ignores late responses after replacement, expiry, completion, reset, unmount or backgrounding. Code content carries `data-sensitive` so integration captures mask it. Normal deploy commands explicitly disable the flag.

`/login/demo` retains the development-only staff account picker. Choosing a fixture account only prefills `PasswordlessPanel`; sending and verifying its OTP, optional authenticator steps, resend and testing controls use the existing flow. Choosing another account unmounts the panel and clears its transient challenge. No password or automatic sign-in is used by the picker.

Identity advertises phone availability. Until discovery succeeds with phone available, authentication and contact-linking forms display email-only labels, omit phone choices and country hints, and reject pasted phone identifiers locally with translated feedback. Discovery failures fail closed to email-only; phone controls return when availability is explicitly restored. Email OTP, authenticator verification/enrollment and recovery remain available.

## Correction review controls

Correction lists use ListPageHeader, FilterSelect, FilterPanel, PageQuery and DataState. Correction detail uses the shared accessible Dialog drawer and FormModal for rejection/consequence confirmation. Structured logbook content, objectives, homework, family summary and progress render as individual differences; use subject/chapter/student names instead of internal identifiers.

### School conversation surfaces

Route-local MessagesView composes ListPageHeader, DataState, DrawerEntityHeader, Dialog, FormModal, Button, Label and Textarea. Read-only teacher oversight uses the same thread presentation without school mutation actions. School queue status, unread state, author identity and conflict feedback are textual as well as visual.

Route-local `ConversationMessageBubble` renders immutable history in chronological DOM order. School staff replies, including colleagues' replies, align right with `primary-container`; guardian messages align left on neutral `muted`. Teacher oversight puts teachers right and guardians left, describing participant roles rather than viewer ownership. Retain actual names, selectable multiline body text and smaller localized timestamps in browser timezone. Direction depends on author kind through the pure `messagePresentation` helper, never display names. Localized article labels identify direction/role, author and time without receipts. Bubbles wrap arbitrary words/URLs, use `radius-surface`, and cap width at 90% compact / 75% wide and 560px; compact enlarged text can use the available width. Header actions wrap at larger text sizes. Reply modal, drafts, infinite loading, polling and permissions retain their existing ownership.

`tests/integration/messaging-browser.ts` contains isolated mocked conversation fixtures and FR/EN, compact/wide, 200% text visual checks. Set `EDAYA_MESSAGE_CAPTURES` to write captures. Dark web captures inject the manifest's existing dark palette for component compatibility review; the staff application remains light-only.

## Feature ownership and action contracts

Shared subject editors, report section comments and document controls receive typed action callbacks from their route/tab state. Presentation components may import API types and pure payload/display helpers, but must not import runtime mutation adapters or API clients.

Dashboard UI belongs to `/dashboard`; import and school timetable generation/publication UI belong to `/configuration/tools`; class calendars, session, attendance and logbook workflows belong to the class timetable subtree. `ReportCardSectionTree` belongs to Configuration report cards, and homeroom comments belong to class report cards. Shared scheduling helpers remain in `lib/scheduling/`.

The route-local timetable workload panel owns the single grade-grouped class list beside its subject editor. Reuse `ListSearchField`, `Checkbox` and `Button`; keep checkbox and class-navigation targets separate. Inclusion and active class drafts remain in the generation modal. On narrow screens stack the list above the editor and bound the list's scrolling area; keep the modal footer reachable without horizontal clipping. Do not recreate an additional class selector elsewhere in the modal.

`StaffPicker` callers must set `active` deliberately. The removed compatibility wrapper always forced active loading, including callers that passed a false flag; its migrated class-assignment callers preserve that behavior with `active`.

## Inbox and corrections presentation

Messages and Corrections use `ListPageHeader`, pill `FilterSelect` controls, a single labeled `FilterPanel`, and `ListEntityTable` with semantic status chips and infinite loading. Corrections keeps its debounced `ListSearchField` in the header. Messages combines all authorized conversation types, with row tags and optional type, status and order filters; do not add a search that silently covers only loaded conversations. Detail drawers use a close-only shell header and a scrollable content region, full width on phones and half width on desktop.


Interval Edit and Delete actions share RowActionMenu. Report model FormModal includes an optional passing threshold; the drawer displays the saved value or Not configured. Configuration editors reuse FormModal, PermissionGate, FilterSelect, Checkbox, Input and RowActionMenu. RowActionMenu closes after an enabled action is chosen so it cannot obscure the editor’s return destination. School asset slots support a read-only summary and an immediate-save editor. All configuration forms retain keyboard focus within the modal, wrap long labels, and scroll vertically at narrow widths or enlarged text.

### Combined level configuration

The route-local `/configuration/structure` layout owns the level rail, mobile selector, level name and nested Details / Subjects / Classes tab links. LevelDetails owns level fields, edit/delete actions and grading configuration within Details. Reuse `GradeLevelFormModal`, `GradingConfigurationModal`, `SubjectFormModal` and `ClassGroupFormModal`; no duplicate workload editor. Subject/class row menus open those same editors. Class tables use a focusable horizontal scroll region on narrow screens.

### Report card templates in level Details

Levels and Classes → Details contains Report card templates below the level's grading settings. The collection is scoped to the selected level and workspace academic year, with multiple templates supported. Show all templates in that scope without search or status-filter controls; legacy search/status parameters do not restrict the collection. The section header exposes only Add model; omit its export menu and standalone row Edit buttons. Clicking a template opens its drawer, which retains editing actions. Template cards keep the white card surface on hover and selection, using the border and focus ring for feedback. Creation captures and displays that level/year as read-only; scope changes discard the open create surface. Existing template mutations and REPORT_CARD_CONFIGURE gates remain in effect. The combined navigation entry includes REPORT_CARD_CONFIGURE and there is no separate templates entry.

The Details layout owns ReportCardsPageState and its PageQuery. Template drawers use `/configuration/structure/details/report-cards/{id}`; closing returns to Details with the level selection and filters retained. Changing level or year closes the prior drawer/modal. Legacy `/configuration/report-cards` URLs redirect, retaining modal/filter context; a template deep link resolves its own level and academic year before editing. Grading scales stay separate. No persistence or report-generation behavior changes.

The Levels and Classes tab-content container uses flex gap for spacing, never sibling margins: its URL-backed subject, class and template drawers and backdrops are fixed to the viewport and must remain at top zero without inherited layout margins.

At desktop widths, the Levels and Classes level rail uses a full-height white card background flush with the configuration area’s left, top and bottom edges, and a border-color vertical divider on its right edge. Desktop outer padding belongs to the main content column rather than the enclosing configuration surface. Its heading, add action, search and level list stay sticky inside the padded rail. Small screens retain the compact selector without a vertical divider.

Other configurations uses the same desktop rail treatment: a 17rem white panel flush with the configuration area’s left, top and bottom edges, a right border-color divider, and padding in the main content column. Its sticky navigation is headed “Configurations” in both English and French. Small screens stack the labeled navigation above the content with normal page padding. Preserve permission-filtered destinations and selected and keyboard-focus states.

### Permission profile inspection

Permission profile rows open `/configuration/permission-profiles/{id}` and have no row action menu. Keep the list, search and page export behind a focus-managed Dialog drawer. Use DrawerEntityHeader with Edit as a primary action and Delete in its overflow, opening the existing mutation/confirmation modals with ACCESS_CONTROL_MANAGE gates and impact review. Show name, optional description, permission and bound-staff counts, and initially expanded groups containing only included permissions; use localized labels, catalog scope-type badges and a label fallback for uncatalogued codes. Scope badges describe supported types, not staff-specific assignments. Empty profiles have an explicit empty message. Preserve modal deep links, search, history, focus restoration and mobile wrapping. Closing clears the drawer modal; edits refresh its content and successful deletion returns to the list.


## Canonical permission catalog and resource selections

The API catalog's `staffAssignable`, `serviceAccountAssignable`, `assignmentTargets` and `scopePolicy` determine picker availability. Do not infer eligibility from action names or maintain permission-specific scope exceptions. Unscoped actions have no scope/default controls, supported-scope badges, or effective-scope labels. Their internal `school` grant marker is never a user selection. Profiles automatically include their unscoped actions; mixed profiles expose resource selectors only for resource-scoped members. Default scopes contain resource selections only. Empty resource selections grant no access; broad access requires explicit All at a supported grain. Preserve preview/save identity, ordering, first-wins and unresolved/shadowed warnings.

### Weekly period calendar

The period-grid route uses only the SVAR Calendar view, including when the selected year has no slots. Remove the compact board and view switcher; legacy `display` parameters have no effect. Reuse the installed class-timetable calendar dependency and shared `components/calendar/SvarCalendarLocale`; route components must not import class-route components. Use bundled fonts, semantic theme tokens, weekday unit columns and a fixed local anchor date solely for rendering. Never persist that date or expose date navigation. Hide empty weekend columns independently; retain scheduled weekends. Reset selection and weekend visibility on school/year changes.

Provide a visible bottom resize handle on every slot, including short breaks. Pointer capture separates resizing from moving/creating; Escape, pointer cancellation and unmount restore the original height without saving. Up/Down on the focused handle adjusts the end by five minutes. Use the rendered time scale for the pointer delta, without a minimum event-height threshold. During dragging, show the snapped end-time preview on the card without changing route data; prioritize the time over the label on short slots. Clear that preview on release, cancellation or unmount so failed saves show the original time. Resize changes end time only, normalize to five-minute clock boundaries, and validate a positive same-day range against all slots (including breaks) in the current school/year/weekday. Adjacent endpoints are allowed. Whole-slot moves preview both displayed times from the native card position, snapping the start to five minutes and preserving duration. Clear the local preview when the native drag ends or the card unmounts; prioritize the time on short slots as during resizing. Whole-slot moves snap the start time, preserve duration and may change weekday; validate against the destination weekday. Keep configured order and other metadata. Route state owns the existing save mutation; serialize writes and cancel the vendor's internal update so only successful API results update displayed data. Failed saves leave the previous time intact. These client checks do not replace server validation or protect against concurrent changes by another client.

Keep the existing add/wizard actions and permission-gated edit/delete modals. Show adjacent in-slot Edit and Delete icons on hover, keyboard focus or selection (always on touch devices); prevent them from starting a drag. Highlight the selected slot. Keep card actions keyboard-focusable with slot-specific accessible labels. Do not show a separate slot selector or Edit/Delete toolbar. Keep the caption and weekend control in a wrapping header with an 8px gap above the calendar. Save/pending announcements remain screen-reader accessible without a reserved status row; failures appear inline, while successful saves use the existing toast. Announce save/error results in the active locale. The calendar supports pointer moving and resizing; precise keyboard time editing stays in the modal.

Drag across empty calendar space to open the existing creation modal with the selected weekday and independently snapped start/end times. Validate a positive same-day selection and overlaps before opening and again against current data on submission. Scope the in-memory form seed to the current school/year, and clear it when the modal closes or Add slot is used. Cancel creates nothing; only the existing save mutation creates a slot. Keep Add slot for keyboard/touch creation and retain confirmation before deletion.

### Finance composition

Use ListEntityTable and InfiniteList for fees, assigned fees and payment records; ListPageHeader, existing search/select/filter controls and row action menus for list actions. Compose DrawerEntityHeader, DrawerField, Dialog, PermissionGate and FormModal for fee and billing detail. FinanceOverview and the shared payment form are finance compositions, not a new global component framework. Keep read-only terms and persisted history separate from mutation controls. Permission gating includes the selected student context.

## Configurable table columns

`ListEntityTable` renders each header and cell from one ordered visible-column collection. Consumers provide stable column keys and a keyed `cell(row, column, context)` snippet. The identity column is mandatory; selection and actions are structural controls. Existing default columns remain visible unless the user changes them. Optional fields use explicit labels, minimum widths, availability checks and a group in the searchable Columns checklist. Show all available and Reset to defaults preserve sorting, filters and pagination. Hidden active sort fields remain identified above the table. A selectable column is sortable only when the complete matching dataset can be sorted.

The Columns control sits above horizontal scrolling. Versioned browser preferences contain keys only, scoped by authenticated subject, school and stable list identifier. Restoration discards obsolete and unavailable keys. Disabled or corrupt browser storage falls back to defaults. Student card layout settings are separate. People-list CSV exports use selected authorized columns across the current matching dataset; document-generation contracts remain separate. Optional relationship and annual groups load in batches; sensitive health groups load only when selected and authorized. Partially authorized rows display Restricted, separately from Not provided.

Shared person identity fields retain canonical first and last names, original supplied names, both student matricules and guardian occupation. Shared guardian contact and relationship editors preserve all unmodified values. Relationship flags always remain attached to their respective student. Unknown annual boolean/number values remain distinct from false and zero.
