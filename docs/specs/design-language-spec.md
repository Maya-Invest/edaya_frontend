# EDAYA Webapp Design Language Spec

> **Applies to:** `apps/webapp` visual design (colors, typography, spacing, components, motion)

This document captures the visual design language extracted from the current webapp implementation. Use it when building new screens, components, or marketing surfaces that must feel native to EDAYA.

---

## 1. Brand character

EDAYA is a school management product for non-technical staff. The visual language optimizes for **clarity, calm, and institutional trust** — not density or flash.

| Trait | Expression |
|-------|------------|
| **Warm institutional** | Deep teal primary, sage accent, soft off-white backgrounds |
| **Editorial headings** | Fraunces serif for titles; gives personality without sacrificing readability |
| **Operational clarity** | Inter for body; mono for metadata, counts, and role labels |
| **Restrained color** | ~80% neutral · ~15% teal · ~5% gold (see `ui-tones.ts`) |
| **Soft geometry** | Generous rounding (`rounded-xl`, `rounded-2xl`, `rounded-full`) |
| **Layered depth** | Subtle borders + `shadow-soft` / `shadow-panel`; no harsh drop shadows |

**Source palette:** Coolors `#004d5a · #cc8b12 · #76958c · #5a726e · #0f2c31 · #132c78` — mapped into HSL CSS variables in `apps/webapp/src/app.css`.

---

## 2. Design tokens

All colors are HSL CSS custom properties consumed by Tailwind (`apps/webapp/tailwind.config.ts`). Never hard-code hex in components; use semantic tokens.

### 2.1 Core palette

| Token | Role | Light value (HSL) |
|-------|------|-------------------|
| `--background` | Page canvas | `160 10% 98%` — warm off-white |
| `--foreground` | Primary text | `189 53% 13%` — deep teal ink |
| `--card` | Elevated surfaces | `0 0% 100%` |
| `--primary` | Brand actions, avatars, active nav | `189 100% 18%` |
| `--primary-foreground` | Text on primary | `0 0% 100%` |
| `--secondary` | Hover fills, muted panels | `163 10% 93%` |
| `--muted` / `--muted-foreground` | De-emphasized text, placeholders | `163 8% 95%` / `170 12% 40%` |
| `--accent` | Progress bars, success toasts, active rail indicator | `163 13% 52%` — sage green |
| `--accent-soft` | Soft accent backgrounds | `163 12% 91%` |
| `--highlight` | Warnings, pending states | `39 84% 44%` — gold |
| `--highlight-soft` | Soft warning backgrounds | `39 40% 94%` |
| `--sky` | Secondary teal accent | `189 60% 28%` |
| `--destructive` | Errors, delete, high severity | `0 70% 55%` |
| `--border` / `--input` | Dividers, field borders | `163 10% 88%` |
| `--ring` | Focus ring | `189 100% 18%` |

### 2.2 Radius, shadows, gradients

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `0.875rem` (14px) | Base radius; Tailwind `rounded-lg` |
| `--shadow-soft` | Layered 1–6px blur | Cards, pills, table containers |
| `--shadow-panel` | 20px blur, stronger | Drawer, dropdowns, toasts |
| `--gradient-mint` | `accent → primary` diagonal | Decorative (available, rarely used inline) |

Tailwind aliases: `rounded-md` = `radius - 2px`, `rounded-sm` = `radius - 4px`.

### 2.3 Tone budget (`ui-tones.ts`)

Centralized class strings for consistent semantic coloring:

```ts
// Neutral default
BADGE          = 'bg-secondary text-foreground/80'
SURFACE        = 'rounded-xl bg-secondary/50 p-3'

// Teal (info / entity)
BADGE_INFO     = 'bg-primary/10 text-primary'
SURFACE_INFO   = 'rounded-xl bg-primary/5 p-3'
ROW_ACTIVE     = 'bg-primary/10'
AVATAR         = '… bg-primary … text-primary-foreground'

// Gold (warning / pending)
BADGE_WARN     = 'bg-highlight-soft text-highlight'
SURFACE_WARN   = 'rounded-xl bg-highlight-soft/60 p-3'

// Red (danger)
BADGE_DANGER   = 'bg-destructive/10 text-destructive'
```

Import from `$lib/ui-tones` or extend `drawer-constants.ts` patterns — do not invent one-off badge colors.

---

## 3. Typography

### 3.1 Font families

| Role | Family | CSS variable | Tailwind |
|------|--------|--------------|----------|
| **Display** | Fraunces (serif) | `--font-display` | `font-display` |
| **Body** | Inter | `--font-sans` | default / `font-sans` |
| **Meta** | JetBrains Mono | `--font-mono` | `font-mono` |

Loaded via Google Fonts in `app.css`. Body uses `font-feature-settings: 'ss01', 'cv11'` and antialiasing.

### 3.2 Type scale & usage

| Element | Classes | When |
|---------|---------|------|
| Page title | `font-display text-2xl font-semibold` | List page `<h2>` via `ListPageHeader` |
| Section title | `font-display text-base font-semibold` | Panel/card headers |
| Drawer entity name | `font-display text-2xl font-semibold` | Student name, etc. |
| Dashboard hero | `font-display text-xl` or `text-3xl` | Login, educator dashboard |
| Body | `text-sm` | Default copy, table cells |
| Caption | `text-xs text-muted-foreground` | Descriptions, hints |
| Eyebrow / module label | `font-mono text-[10px] uppercase tracking-widest text-muted-foreground` | Sidebar module, list eyebrows |
| Role / meta chip | `font-mono text-[9px] uppercase tracking-wider text-muted-foreground` | User role under name |
| Table header | `text-[11px] font-medium uppercase tracking-wider text-muted-foreground` | Column headers |
| Field label (read-only) | `text-[11px] font-medium uppercase tracking-wider text-muted-foreground` | `DrawerField` |
| Form label | `text-sm font-medium` | `Label` component |
| Numeric emphasis | `font-display tabular-nums` | Averages, scores |
| Mono detail | `font-mono text-[10px]` | Date ranges, counts in badges |

**Display headings** use `letter-spacing: -0.02em` and optical sizing (Fraunces `opsz`).

### 3.3 Hierarchy rules

- One display title per viewport region (page header, drawer hero, modal title).
- Eyebrows are optional; use for module/context, not for every section.
- Prefer `text-muted-foreground` over smaller font sizes for de-emphasis.
- Uppercase + tracking is reserved for labels and metadata — not sentences.

---

## 4. Spacing & layout rhythm

### 4.1 Shell dimensions

| Zone | Size / pattern |
|------|----------------|
| App sidebar | `w-64`, `bg-card/60 backdrop-blur`, `border-r border-border` |
| App rail (alt) | `w-16`, `bg-primary` — icon-only module switcher |
| Context sidebar | `w-72`, same frosted card treatment |
| Header bar | `h-14`, `border-b`, `px-6`, `bg-card` |
| Main content | `flex-1`, typically `p-6` on list routes |
| Detail drawer | `md:w-1/2`, full width mobile, `shadow-panel` |

### 4.2 Content spacing

| Pattern | Spacing |
|---------|---------|
| Page header → collection | `mb-5` (`ListPageHeader`) |
| Section stacks | `space-y-4` to `space-y-6` |
| Card/panel padding | `p-5` (panels), `p-3` (stat tiles) |
| Drawer body | `px-6 py-6` |
| Grid stat tiles | `grid gap-3`, `grid-cols-3` common |
| Inline clusters | `gap-2` (toolbar), `gap-3` (identity blocks), `gap-4` (hero rows) |

### 4.3 Container

Tailwind `container` is centered with `2rem` padding, max `1400px` at `2xl`. Most app views use full-width flex layout inside the shell instead.

---

## 5. Shape language

Rounding is a primary brand marker. Default to soft corners.

| Class | Use |
|-------|-----|
| `rounded-full` | Pills: search inputs, filter chips, segmented controls, badges, header selectors, icon buttons |
| `rounded-2xl` | Cards, panels, table wrappers, avatars (large), empty/error states, toasts |
| `rounded-xl` | Logo tiles, list avatars, list items, stat tiles, dashed empty states |
| `rounded-lg` | Nav items, dialog content (base), sub-nav links |
| `rounded-md` | Buttons (default), inputs, small badges |

**Rule:** toolbar controls and header selectors are pill-shaped (`rounded-full`). Content containers are `rounded-2xl`.

---

## 6. Elevation & borders

### 6.1 Surface stack (bottom → top)

1. **Canvas** — `bg-background`
2. **Frosted chrome** — `bg-card/60 backdrop-blur` (sidebars)
3. **Card** — `bg-card border border-border shadow-soft`
4. **Overlay** — drawer/modal: `bg-card shadow-panel`; scrim `bg-primary/5` (drawer) or `bg-black/80` (dialog)

### 6.2 Borders

- Default divider: `border-border`
- Destructive emphasis: `border-destructive/20`
- Warning emphasis: `border-highlight/20` or `border-amber-500/30`
- Dashed empty: `border-dashed border-border`
- Active selection: background tint (`bg-primary/10`) rather than heavy borders

### 6.3 Shadows

| Class | When |
|-------|------|
| `shadow-soft` | Cards, tables, pill toolbars, small logo tiles |
| `shadow-panel` | Drawer, dropdown menus, toasts, login hero icon |

Avoid `shadow-lg` on app surfaces — reserved for dialog primitive default.

---

## 7. Motion

Defined in `tailwind.config.ts` + `app.css` utilities.

| Animation | Duration / easing | Usage |
|-----------|-------------------|-------|
| `animate-fade-in` | 0.3s ease-out, `translateY(4px)` | Page enter, dropdowns, data states, toasts |
| `animate-slide-in-right` | 0.35s cubic-bezier(0.32, 0.72, 0, 1) | Detail drawer (desktop) |
| `animate-spin` | default | `LoaderCircle` loading indicators |
| Accordion | 0.2s ease-out | bits-ui accordion (if used) |

**Accessibility:** drawer/backdrop use `motion-safe:` prefix. Respect `prefers-reduced-motion`.

**Page pattern:** top-level views wrap content in `animate-fade-in` on mount.

---

## 8. Iconography

- **Library:** Lucide via `$lib/icons` (re-export hub)
- **Default size:** `h-4 w-4` in buttons; `h-3.5 w-3.5` in compact chrome; `h-8 w-8` in empty/error states
- **Color:** inherit or `text-muted-foreground`; active nav uses `text-accent` or `text-primary`
- **Placement:** leading icon in buttons (`gap-2`); search icon absolutely positioned `left-3`
- **Product mark:** `GraduationCap` in rounded primary tile

---

## 9. Component catalog

### 9.1 Primitives (`src/lib/components/ui/`)

Built on **bits-ui** + **Tailwind**, shadcn-style patterns.

| Component | Variants / notes |
|-----------|------------------|
| **Button** | `default` (primary), `destructive`, `outline`, `secondary`, `ghost`, `link`; sizes `default`/`sm`/`lg`/`icon`. Focus ring: `ring-2 ring-ring ring-offset-2`. Toolbar CTAs often add `rounded-full`. |
| **Input** | `h-10 rounded-md border-input`; search overrides: `h-9 rounded-full pl-9`. |
| **Textarea** | Matches input styling |
| **Label** | `text-sm font-medium` |
| **Checkbox** | bits-ui; compact `h-3.5 w-3.5` in popover lists |
| **Select / FilterSelect** | Native `<select>` with chevron overlay; filters use `rounded-full text-xs` |
| **Dialog** | Centered `max-w-lg`, `bg-background p-6`, dark scrim `bg-black/80` |
| **Popover** | `rounded-2xl border shadow-panel` for menus |
| **FormModal** | Dialog + ghost Cancel + primary Save |
| **ConfirmModal** | Dialog + destructive Confirm |
| **PickerModal** | Dialog + confirm label defaults to "Ajouter" |
| **DataState** | Centered `min-h-[40vh]`; error uses destructive tint card; empty uses inbox icon |
| **ListPageHeader** | Standard list page title block with snippet slots |
| **PermissionGate** | `hide` or `disable` + tooltip — no visual chrome |
| **ToastHost** | Bottom-right stack, `rounded-2xl border shadow-panel` |

### 9.2 Shell components (`src/lib/components/layout/`)

| Component | Visual pattern |
|-----------|----------------|
| **AppSidebar** | Logo tile `rounded-xl bg-primary shadow-soft`; expandable modules; active sub-link `bg-primary text-primary-foreground`; badges `font-mono text-[10px]` |
| **ContextSidebar** | Module title + frosted nav; active item `bg-primary shadow-soft` |
| **AcademicHeader** | Pill container `rounded-full border bg-card/70 shadow-soft backdrop-blur`; segment buttons toggle `bg-primary` when open |
| **SchoolSelector** | Compact pill `h-9 rounded-full` with `Building2` icon |
| **LanguageSelector** | Same pill family |
| **User block** | Avatar circle `bg-primary font-display`; role in mono caps |

### 9.3 Domain components (`src/lib/components/school/`)

| Component | Role |
|-----------|------|
| **DetailDrawer** | Right sheet, kind badge `rounded-full uppercase text-[11px]`, close as ghost circle |
| **DrawerField** | Read-only label + value stack |
| **DrawerEmptyState** | Dashed `rounded-xl` centered placeholder |
| **DrawerActionBar** | Optional drawer body footer — `border-t pt-4`, right-aligned secondary actions; **not** sub-collection `+ Add` header |
| **StudentAvatar** | `rounded-2xl bg-primary` initials; hover camera overlay |
| **List views** (`*View.svelte`) | Compose `ListPageHeader` + card/table collection |

---

## 10. Recurring UI patterns

### 10.1 List page header

```
[eyebrow: mono caps]
[title: font-display 2xl]
[description: text-sm muted]          [search] [filters] [more] [primary CTA]
```

Use `ListPageHeader` snippet slots: `search`, `filters`, `more`, `primary`.

### 10.2 Segmented control (drawer tabs / in-drawer segments)

Pill segment strips for **drawer tab switches** or in-panel mode toggles — **not** for list-page main filters (main filter is always a `<select>`).

```html
<div class="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
  <button class="rounded-full px-3 py-1.5 text-xs font-medium
    [active: bg-primary text-primary-foreground]
    [idle: text-muted-foreground hover:text-foreground]">
```

Drawer tabs use `bg-secondary/40` track and `bg-card shadow-soft` for active segment.

### 10.3 Data table

```html
<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
  <div class="grid … border-b bg-secondary/40 px-5 py-3 text-[11px] uppercase …">
  <button class="grid … px-5 py-3.5 [active: bg-primary/10] [hover: bg-secondary]">
```

- Row click targets are full-width buttons
- Selected row: `ROW_ACTIVE` (`bg-primary/10`)
- Inline empty: centered `text-muted-foreground` inside table

### 10.4 Stat / KPI tile

```html
<div class="rounded-xl bg-primary/10 p-3">        <!-- or bg-secondary/60 -->
  <p class="text-[10px] uppercase tracking-wider text-muted-foreground">Label</p>
  <p class="mt-1 font-display text-xl">Value</p>
</div>
```

Dashboard KPIs may invert: `bg-primary text-primary-foreground` for hero metrics.

### 10.5 Badge / status chip

```html
<span class="rounded-full px-2 py-0.5 text-[10px] font-medium {tone}">
```

Map status → tone via `drawer-constants.ts` or local `Record<Status, string>` using `BADGE_*` presets.

### 10.6 Progress bar

```html
<div class="h-1.5 w-full rounded-full bg-secondary">
  <div class="h-full rounded-full bg-accent" style:width="…%"></div>
</div>
<p class="mt-1 font-mono text-[10px] text-muted-foreground">…%</p>
```

### 10.7 Avatar / initials block

| Size | Classes |
|------|---------|
| Table row | `h-9 w-9 rounded-xl bg-primary font-display text-xs` |
| Drawer hero | `h-14 w-14 rounded-2xl` (`StudentAvatar`) |
| Header user | `h-7 w-7 rounded-full` |
| Login / dashboard | `h-10`–`h-12 rounded-xl` or `rounded-2xl` |

### 10.8 Panel section (dashboard)

```html
<section class="rounded-2xl border border-border bg-card p-5 shadow-soft">
  <header class="mb-3 flex justify-between">
    <h3 class="font-display text-base font-semibold">…</h3>
  </header>
  …
</section>
```

### 10.9 Search field

```html
<div class="relative">
  <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
  <Input class="h-9 w-56 rounded-full pl-9 text-sm" />
</div>
```

### 10.10 Toast

| Kind | Surface |
|------|---------|
| `success` | `border-accent/30 bg-accent/10` |
| `error` | `border-destructive/30 bg-destructive/10` |
| `info` | `border-border bg-card` |

Position: `fixed bottom-6 right-6 z-[100] max-w-sm`.

### 10.11 Dropdown menu

`rounded-2xl border border-border bg-card shadow-panel animate-fade-in`

Items: `px-4 py-2.5 text-sm hover:bg-secondary/60`; selected row `bg-primary/5` + `Check` icon in `text-accent`.

---

## 11. Semantic color mapping

Use these mappings consistently (see `drawer-constants.ts` for full records).

| Meaning | Tone |
|---------|------|
| Default / neutral | `BADGE`, `bg-secondary` |
| Info / entity / active | `BADGE_INFO`, `bg-primary/10` |
| Warning / pending | `BADGE_WARN`, `bg-highlight-soft` |
| Danger / error / high severity | `BADGE_DANGER`, `bg-destructive/10` |
| Success / completed | `bg-secondary` or `bg-accent/10` (toasts) |
| Director / elevated role | `bg-primary/10 text-primary` |
| Teacher / educator role | `bg-secondary text-foreground/80` |

**Incident severity:** low → neutral, medium → warn, high → danger.

**Enrollment status:** approved → neutral, pending → warn, denied → danger.

**Permission / capability chips:** assign → primary tint, read → secondary, update → highlight, delete → destructive.

---

## 12. Form & modal styling

- Modal body spacing: `space-y-4 py-2`
- Footer: ghost Cancel (left) + primary Confirm (right) — `Dialog.Footer`
- Destructive confirms: `variant="destructive"` on confirm button
- Drawer footer: only `Close` on shell when needed; primary entity actions live in **`DrawerEntityHeader`**; sub-collection `+ Add` uses an **inline section header** (not `DrawerActionBar`)
- Field errors: inline in modal — not in the read-only drawer
- Disabled: `opacity-50 pointer-events-none` (buttons)

---

## 13. Responsive behavior

| Breakpoint | Visual adjustment |
|------------|-------------------|
| `< md` | Drawer full-width sheet; sidebar → hamburger menu |
| `≥ md` | Drawer `w-1/2`; table layouts maintained |
| Toolbar | `flex-wrap` on headers; filters wrap to next row |

---

## 14. Dark mode

`darkMode: ['class']` is configured in Tailwind but **no dark theme tokens are defined** in `app.css`. Do not add `dark:` variants until a full dark palette is specified.

---

## 15. Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Svelte 5 + SvelteKit |
| Styling | Tailwind CSS 3 + CSS variables |
| Primitives | bits-ui (Dialog, Popover, Checkbox, Select) |
| Icons | lucide-svelte via `$lib/icons` |
| Utilities | `cn()` from `$lib/utils`, `tailwindcss-animate` |
| i18n | `$lib/i18n` — all user-facing strings |

---

## 16. Do / Don't

### Do

- Use semantic tokens (`bg-primary`, `text-muted-foreground`, etc.)
- Use `font-display` for titles and numeric emphasis
- Use `font-mono` + uppercase for metadata eyebrows
- Wrap collections in `rounded-2xl border bg-card shadow-soft`
- Use pill controls in toolbars and headers
- Import tone presets from `$lib/ui-tones`
- Apply `animate-fade-in` on page-level content
- Keep icon sizes consistent (`3.5` compact, `4` default)

### Don't

- Introduce new accent colors outside the palette
- Use sharp corners (`rounded-none`, `rounded-sm`) on marketing surfaces
- Use heavy shadows or solid black overlays except dialog scrim
- Mix flat Material-style cards with the frosted EDAYA shell
- Use display font for body paragraphs or table data
- Hard-code French strings in components (use i18n)
- Create bespoke badge colors per screen

---

## 17. File reference

| Purpose | Path |
|---------|------|
| CSS variables & fonts | `apps/webapp/src/app.css` |
| Tailwind theme | `apps/webapp/tailwind.config.ts` |
| Tone presets | `apps/webapp/src/lib/ui-tones.ts` |
| Status / badge maps | `apps/webapp/src/lib/components/school/shared/drawer-constants.ts` |
| Button primitive | `apps/webapp/src/lib/components/ui/button/button.svelte` |
| List header | `apps/webapp/src/lib/components/ui/ListPageHeader.svelte` |
| Data states | `apps/webapp/src/lib/components/ui/DataState.svelte` |
| Shell layout | `apps/webapp/src/routes/(app)/+layout.svelte` |

---

## 18. Implementation checklist

When adding a new screen:

- [ ] Page uses `ListPageHeader` (or documented layout variant)
- [ ] Title is `font-display`; eyebrow is `font-mono` caps if needed
- [ ] Collection wrapped in `rounded-2xl border bg-card shadow-soft`
- [ ] Toolbar controls are pill-shaped
- [ ] Status chips use `BADGE_*` tones
- [ ] Selected row uses `bg-primary/10`
- [ ] Loading/empty/error use `DataState`
- [ ] Mutations toast via `toast.success` / `toast.error`
- [ ] Icons from `$lib/icons` at standard sizes
- [ ] Motion uses `animate-fade-in` or `motion-safe:` drawer animations
- [ ] No new colors outside token system
