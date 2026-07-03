# App Shell Architecture Spec

> **Applies to:** `apps/webapp` UI (layouts, list pages, drawers, modals)  
> **See also:** [v1-feature-architecture-spec.md](./v1-feature-architecture-spec.md) — normative routes, entities, locked UX (what to build) · [ui-architecture-reference.md](../reference/ui-architecture-reference.md) — gap tracker & feature cards (sprint planning)

This document defines the standard layout and interaction patterns for the EDAYA school management webapp. All new screens and refactors should conform to these rules.

---

## UX rationale

This architecture optimizes for **clarity, safety, and consistency** over raw speed and data density. That trade-off fits a school product: users are often non-technical, work in interrupted sessions, and mistakes (wrong class, fee, or guardian link) have real consequences.

### What users gain

| Benefit | Why it matters |
|---------|----------------|
| **Look vs change is obvious** | Read-only drawer + modals removes "am I editing?" ambiguity when returning after an interruption |
| **List stays in context** | The collection remains visible behind the drawer — useful when comparing similar records |
| **Shareable detail URLs** | `/module/entity/[id]` links let staff send a colleague directly to a record |
| **One rhythm everywhere** | List → inspect drawer → act via modal is learned once and reused across modules |
| **Grouped entity context** | Tabs with sub-collections match how staff think: "I'm working on *this student*" |
| **Identity + action together** | Main entity summary and top actions live in the drawer header — no hunting in the footer |
| **Pragmatic toggles** | Boolean flips (permissions, status) avoid modal fatigue for high-frequency micro-edits |
| **No empty drawers** | Simple records use a row action menu instead of a detail surface that adds no context |

### Trade-offs we accept

- **Extra click per edit** — list → drawer → action → modal is slower than inline/spreadsheet editing. Acceptable for most school workflows; power users doing bulk updates may feel friction.
- **No "edit everything, save once"** — each mutation is explicit (one modal, one save). Clearer for validation and audit trails; different from legacy school software habits.
- **Overlay stacking** — drawer + modal can feel heavy on small screens. Mitigate with full-screen drawer/modal on mobile (see §6.5).
- **Drawer width** — 50% overlay is fine for profiles; data-heavy tabs (finance, timetable) may need a future "expand drawer" or full-page variant.

### Who this serves best

| User | Fit |
|------|-----|
| Coordinator / secretary | Strong — predictable, hard to misuse |
| Teacher (occasional use) | Strong — low memorization burden |
| Power admin (daily bulk ops) | Moderate — may need batch actions and export-first flows later |
| Mobile / on-the-go | Weaker on small screens unless responsive rules in §6.5 are applied |

### UX risks if implementation drifts

1. **Mixed patterns on one screen** — forms in some drawers and modals in others destroys trust in the pattern. Complex entities use read-only drawer + modal mutations; simple entities use row `···` menus (§3.5).
2. **Stale drawer after save** — modal success must refresh drawer/tab data; otherwise users doubt whether the action worked.
3. **Silent permission denial** — hide or disable edit actions by role, but disabled actions need a tooltip (e.g. "Requires director role").
4. **Dead empty tabs** — sub-collection tabs with no items must show an empty state **and** a `+ Add` CTA when the user can create.
5. **Empty drawer** — opening a drawer that only repeats what the list row already shows wastes a click. Use a row `···` action menu for simple entities (see §3.5).

### Future enhancements (without breaking the core)

- Keyboard navigation on lists (arrow keys, `E` to edit selected row)
- Bulk actions on the list toolbar, not inside the drawer
- Expandable drawer (full width) for data-heavy tabs
- Inline filters for common facets → **main filter `<select>`**; advanced facets behind the filter button

---

## 1. Shell layout

The authenticated app uses a persistent four-layer frame:

```
┌─────────────┬──────────────────────────────────────────────────────────┐
│  Sidebar    │  Header: [School] [Year · Period] [Lang] [User menu ▾]  │
│  Logo       ├──────────────────────────────────────────────────────────┤
│  Modules    │                                                          │
│  └ items    │  Main content (list / dashboard / special view)          │
│             │                                                          │
│             │                              ┌─────────────────────────┐ │
│             │                              │ Detail drawer (overlay) │ │
│             │                              └─────────────────────────┘ │
└─────────────┴──────────────────────────────────────────────────────────┘
                                    +
                          Mutation modal (centered overlay)
                          Toast layer (global feedback)
```

| Zone | Responsibility |
|------|----------------|
| **Sidebar** | Logo, school name, module navigation, contextual sub-nav (e.g. class picker in Classes) |
| **Header** | Global context selectors + user identity |
| **Body** | One primary entity-collection view per route (or an approved layout variant) |
| **Detail drawer** | Read-only inspection of a selected entity |
| **Mutation modal** | All create, edit, and destructive operations |
| **Toast** | Success / error feedback after mutations |

### 1.1 Sidebar

- Logo + product name at top
- Module groups (e.g. School, Classes, Finance, Configuration)
- Active module expanded; sub-items with optional badges (counts)
- Contextual selector inside a module when needed (e.g. class picker in Classes)

### 1.2 Header

Global selectors (scope data for the whole session/view):

| Selector | Purpose |
|----------|---------|
| School | Multi-tenant context |
| Academic year + period | Data time scope |
| Language | i18n locale |
| User menu | Avatar, name, role; dropdown with profile/preferences and sign out |

### 1.3 Layout variants

Most routes use the **list + drawer** pattern. Non-list screens may use approved variants:

- **Dashboard** — KPIs + summary cards above or instead of a collection
- **Calendar** — time-grid layout
- **Matrix** — grid of toggles (e.g. role permissions)
- **Timetable grid** — schedule cells

Variant layouts still use the same shell (sidebar + header). Only the body layout differs.

---

## 2. List page template

Every entity list route shares this anatomy:

```
┌ Title                   [Primary CTA] [Search] [Main filter ▾] [Filter ▾] [More ▾] ┐
│ Description / subtitle                                                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│  Collection: table OR cards                                              │
│  - complex entity: row/card click → detail drawer (URL updates)          │
│  - simple entity: row `···` menu → mutations (no drawer)                 │
│  - selected item highlighted while drawer is open                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Page header

| Element | Rule |
|---------|------|
| **Title** | Entity name; optional live count (`Students · 142`) |
| **Description** | One line of context; do not duplicate filter labels |
| **Primary CTA** | Exactly one main action (e.g. "Add student") → opens **create modal** |
| **Search** | Always on list pages. Instant text filter on primary label fields. Placed **alongside** the main filter. |
| **Main filter** | Always a **`<select>`** — one highest-frequency facet (class, status, category…). No chip bars or pill toggles. |
| **Filter button** | Secondary / advanced facets (extra statuses, date range, scope, enrollment band…) |
| **More menu** | Secondary actions: export, import, bulk ops, view toggle, column settings |

### 2.2 Collection

| View | When to use |
|------|-------------|
| **Cards** | People, entities with rich identity (avatar, status chips) |
| **Table** | Dense data, sortable columns, bulk selection |
| **Hybrid** | User-toggleable via More menu |

### 2.3 List behaviors

- **Pagination or infinite scroll** — required for scalable collections
- **Sort** — column header or sort dropdown
- **Bulk selection** — checkbox column + floating action bar when rows selected
- **Row action menu** (`···`) — required on every row/card; holds edit/delete and other mutations. For **simple entities** (§3.5), this is the primary mutation surface instead of the drawer.
- **Filter persistence** — prefer URL query params (`?class=6a&status=active`)
- **States** — wrap content in a loading / empty / error wrapper; empty state may include a CTA

### 2.4 Routing convention

```
/{module}/{entity}           → list
/{module}/{entity}/[id]      → list + detail drawer (complex entities only)
```

Detail selection must be URL-backed for deep linking and browser back/forward when a drawer is used. Simple entities (§3.5) may omit the `[id]` segment; use a detail modal with URL only when deep links are explicitly required.

---

## 3. Detail drawer

The drawer is a **read-only inspection surface** for **complex entities** — records with related content worth browsing beyond what the list row shows. It does not host open forms or editable fields by default. Simple entities skip the drawer entirely (see §3.5).

### 3.1 Anatomy

The drawer has three layers: shell chrome, entity header, and body.

```
┌─ [Entity type chip] ──────────────────────────────────────── [×] ┐
│  SHELL HEADER (chrome only)                                      │
├──────────────────────────────────────────────────────────────────┤
│  [Avatar]  Name · status chips · one-line summary                │
│            [Primary action]  [Secondary action]  [··· overflow]    │
│  ENTITY HEADER (identity + up to 2 visible actions)            │
├──────────────────────────────────────────────────────────────────┤
│  [Tab 1] [Tab 2] [Tab 3] …        ← when tabs are justified     │
├──────────────────────────────────────────────────────────────────┤
│  Sections and/or tab bodies (related content only)               │
│  DRAWER BODY                                                     │
└──────────────────────────────────────────────────────────────────┘
```

| Part | Rule |
|------|------|
| **Shell header** | Entity type badge + close button only |
| **Entity header** | Identity block (avatar/photo, name, 1–3 status chips, one-line summary) + up to **2 primary entity actions** (each opens a modal). Additional actions go in a `···` overflow menu. Destructive actions (delete, archive) never appear in the top 2 — overflow + confirm modal only. |
| **Body** | **Related content only** — not a repeat of list-row columns. Organized by **sections**, **tabs**, or **both** (see §3.2). |
| **Footer** | Omit when Close lives in the shell header. If present: Close only — **no global Save**, no duplicate of entity-header actions. |

### 3.2 Body organization: sections, tabs, or both

The drawer body holds content that adds context beyond the list. Choose the lightest structure that fits:

| Structure | When to use |
|-----------|-------------|
| **Sections only** | Single context, no sub-collections, content fits in ~1 viewport (e.g. incident summary, calendar event details) |
| **Tabs** | 2+ distinct related domains or sub-collections (e.g. student attendance vs finances vs incidents) |
| **Tabs + sections** | Tabs split major domains; sections group fields within a tab (e.g. Student **Profile** tab: identity, health, linked guardians) |

**Tab threshold** — use tabs when any of these is true:

- 2+ sub-collections scoped to the parent entity
- 2+ domains staff think about separately ("this student's grades" vs "this student's fees")
- Ungrouped content would exceed ~1 viewport height

**Do not** add tabs to pad a thin record. Prefer sections or skip the drawer (§3.5).

Canonical example: **Student 360** — entity header (photo, class, Change class) → tabs (Profile, Grades, Attendance, …) → sections inside Profile.

### 3.3 Opening and closing

- Open: click row/card in list → navigate to `…/[id]` → drawer syncs from URL (complex entities only)
- Close: Close button or backdrop → navigate back to list URL
- Drawer overlays the list; list remains visible underneath (desktop)

### 3.4 Edit affordances in the drawer

Editing inside the drawer is **not allowed by default**. Two patterns are permitted:

#### Pattern A — Action button → modal (default for all multi-field edits)

```
Entity header:  [Edit profile]  [Change class]
Section header: [+ Add note]    (sub-collection CTA)

Click → edit modal opens
On save → modal closes, drawer data refreshes, toast shown
```

Use for: create/edit forms, multi-field changes, sub-entity add/edit. Primary entity actions belong in the **entity header**; sub-collection CTAs belong on the **section or tab header**.

#### Pattern B — Pragmatic inline toggle (boolean / single-value only)

For **simple boolean or single-value toggles** (status chip, permission cell, attendance checkbox):

- Toggle flips immediately
- Persist on change (optimistic or await server)
- Toast on success/error
- No multi-field form in the drawer

**Do not** use inline toggle for forms with more than one field or across multiple sections — use a modal.

### 3.5 Simple entities (no drawer)

When a record has **nothing meaningful to browse** beyond what the list already shows, **do not open a drawer**.

**Qualifies as simple** when all are true:

1. No sub-collections to inspect
2. No cross-entity context the list row does not already convey
3. At most a few mutations, all reachable via modal

**List behavior for simple entities:**

| Element | Rule |
|---------|------|
| Row/card click | No-op, or select for bulk — **never** open an empty drawer |
| Row `···` menu | Edit, Delete, and other mutations → modals / confirm dialogs |
| Primary CTA | Unchanged — **Add …** on the list toolbar → create modal |
| Deep links | Optional `[[id]]` route only when shareable URLs are required; prefer opening an edit modal from the URL |

Examples: grade scale (edit bands in modal), notification template (edit body in modal). Borderline cases (e.g. fee definition) — prefer row menu unless usage/billing sub-data justifies a thin drawer.

### 3.6 What must NOT appear in the drawer

- Open form fields on load (no form component as default drawer body)
- Global Save / Cancel pair on the drawer shell
- List-row columns repeated as the sole drawer content
- Sub-collection add/edit inline — always modal (see §4)

---

## 4. Complex entities: tabs and sub-collections

Complex entities (e.g. Student) use the body patterns in §3.2. A tab is either:

1. **Read-only profile** — labeled field sections, no inputs
2. **Sub-collection** — a mini list page scoped to the parent entity

### 4.1 Sub-collection tab anatomy

```
┌ Sub-collection: Pedagogical notes ──────────────── [+ Add note] ┐
│  • Note 1 — 12 Mar                    [Edit] [Delete]           │
│  • Note 2 — 05 Feb                    [Edit] [Delete]           │
└─────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| **Header** | Sub-entity name + count |
| **Primary CTA** (`+ Add …`) | Opens **create modal** for the sub-entity |
| **Row actions** | Edit → **edit modal**; Delete → **confirm modal** |
| **Row click** | Expand read-only detail inline, or no-op — never inline edit form |
| **Search / filter** | Optional; same toolbar pattern as main list, scoped to tab |

**Hard rule:** all sub-collection **add** and **edit** operations open a modal. The tab renders read-only lists only.

---

## 5. Mutation modals

All mutations use centered modal dialogs.

### 5.1 Modal types

| Type | Use | Footer |
|------|-----|--------|
| **Form modal** | Create / edit | Cancel + Save |
| **Confirm modal** | Delete, archive, irreversible | Cancel + Confirm (destructive style) |
| **Picker modal** | Link/assign related entity | Cancel + Select |

### 5.2 Modal rules

- Validate before submit; show field errors inline
- Toast on success and on server error
- On success: close modal, refresh parent list and/or drawer tab data
- Do not navigate away from the current list+detail URL
- Focus trap; Escape closes; return focus to trigger on close

### 5.3 Decision matrix

| User intent | Surface |
|-------------|---------|
| Browse entity list | Main body |
| Inspect complex entity | Detail drawer (entity header + body) |
| Inspect simple entity | List row only — no drawer |
| Inspect tab sub-collection | Drawer tab (read-only list) |
| Create main entity | Modal (from list primary CTA) |
| Create sub-entity (tab) | Modal (from tab `+ Add`) |
| Edit main entity (complex) | Modal (from drawer entity-header action or `···` overflow) |
| Edit main entity (simple) | Modal (from list row `···` menu) |
| Edit sub-entity | Modal (from row action) |
| Delete / archive | Confirm modal (from drawer overflow or row `···` menu) |
| Boolean / single-value toggle | Pragmatic inline toggle + immediate save + toast |
| Multi-field edit | Always modal |

---

## 6. Cross-cutting concerns

### 6.1 Feedback

| Event | UX |
|-------|-----|
| Mutation success | Toast (success) |
| Validation failure | Inline in modal |
| Server error | Toast (error) + retry where applicable |
| Destructive action | Confirm modal before submit |

### 6.2 Data states

Every list route wraps its collection in explicit loading, empty, error, and ready states:

- **Loading** — spinner or skeleton
- **Error** — message + retry
- **Empty** — message + optional CTA
- **Ready** — render collection

### 6.3 Permissions

Actions are gated by role:

| Denied | UX |
|--------|-----|
| Not allowed | Hide button, or show disabled with tooltip |
| Read-only entity | Drawer opens; edit actions hidden |

Role is shown in the header user block; permission checks should be applied per action.

### 6.4 Global context

Changing school, academic year, or period invalidates/refetches list data for the active route. Screen logic should derive scope from the shell's global context selectors, not hard-coded values.

### 6.5 Responsive

| Breakpoint | Behavior |
|------------|----------|
| Desktop | Sidebar fixed; drawer 50% width overlay |
| Mobile | Sidebar → hamburger; drawer → full-screen sheet; modals → full-screen or near-full |

Respect `prefers-reduced-motion` for drawer/modal animations.

### 6.6 Accessibility

- Escape closes drawer and modals
- Focus trap in modals
- `aria-live` for loading states
- Keyboard-navigable list rows and tab strips

---

## 7. Entity implementation checklist

Use this template when adding or refactoring an entity screen.

```markdown
### Entity: <Name>

#### Complexity
- [ ] Complex → detail drawer
- [ ] Simple → row `···` menu only (§3.5)

#### Routes
- List: `/<module>/<entity>`
- Detail (complex only): `/<module>/<entity>/[id]`

#### List page
- Title:
- Description:
- Primary CTA: → <CreateModal>
- Search fields:
- Filters:
- More menu items:
- View: cards | table
- Row `···` menu items:
- Empty state CTA:

#### Detail drawer (complex only)
- Entity header: identity fields + up to 2 primary actions → <Modal>
- Overflow (`···`): <additional actions, including delete>
- Body structure: sections | tabs | tabs + sections
- Tabs (if justified):
  - <Tab A>: read-only sections
  - <Tab B>: sub-collection → read-only list + `+ Add` → modal
- Inline toggles (pragmatic only): <list or "none">

#### Modals
- Create modal
- Edit modal
- Delete confirm modal
- (sub-entity modals as needed)

#### States & permissions
- Loading / empty / error on list route
- Toast on all mutations
- Role gates: <which actions require which role>
```

### Naming conventions

| Artifact | Pattern |
|----------|---------|
| List view | `<Entity>View` |
| Read-only drawer body | `<Entity>Detail` or `<Entity>Tabs` |
| Sub-collection list (in tab) | `<Entity><Sub>List` |
| Create / edit modal | `<Entity>FormModal` |
| Confirm modal | `<Entity>DeleteModal` |
| Route | optional `[[id]]` segment for URL-backed drawer |
