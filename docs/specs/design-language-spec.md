# EDAYA webapp design language

Normative. Applies only to the staff `apps/webapp`. Website, webadmin, services, and generated documents are outside this specification. Source: supplied EDAYA brand guide and outlined logo assets; current source code defines available workflows. Historical proposals and galleries do not authorize feature or navigation changes.

## Visual foundations — version 1.0.0

EDAYA should feel calm, trustworthy, and carefully finished. Staff, teachers, and families should recognize one brand while retaining interfaces suited to their daily tasks. Improve clarity through hierarchy, typography, spacing, and consistent feedback; preserve familiar workflows and effective components.

| Role | Light value | Application |
|---|---|---|
| Primary | `#2563EB` | Actions, links, selection; hover `#1D4ED8` |
| Supporting sky | `#60A5FA` | Decoration, never small text on white |
| Amber | `#FBBF24` | Restrained decoration, under 10% of visible surface; navy foreground |
| Canvas / surface | `#F0F7FF` / `#FFFFFF` | Sky canvas, white cards and chrome |
| Text / secondary | `#1E293B` / `#64748B` | Titles/data and supporting labels |
| Separator / control outline | `#E2E8F0` / `#64748B` | Subtle structure; identifiable inputs |
| Success | `#15803D` on `#F0FDF4` | Confirmed success, with a label/icon |
| Warning | `#92400E` on `#FEF3C7` | Pending or caution, with a label/icon |
| Danger | `#B91C1C` on `#FEF2F2` | Error, overdue, destructive actions |
| Information | `#1D4ED8` on `#E0F2FE` | Informational states |

The base slate remains `#64748B`; the shared secondary-text role uses `#5B6B82` so small text also meets contrast on the sky canvas (the base slate measures only 4.41:1 there).

Poppins Semibold is for headings; Inter Regular/Medium/Semibold/Bold is for body, labels, buttons, tables, and all numerical data. Load fonts from bundled files with their OFL licenses. Never request fonts from a third-party server at runtime. Use tabular figures for aligned amounts and scores. Use 28px web page titles, 24 logical pixels mobile page titles, 20 section titles, 16 card titles, 14–16 body, and 12 supporting labels. Heading line-height is about 1.3; body 1.5–1.6. Support wrapping and enlargement; do not shrink important values to fit.

Use the 4/8/12/16/24/32/48 spacing scale. Retain established rounded primitives: 12 controls, 14 base, 16 cards, 24 overlays. Keep shadows restrained and neutral. Useful existing motion stays, with reduced-motion support; avoid decorative perpetual animation.

## Artwork

The supplied outlined EDAYA logos are authoritative artwork. Never reconstruct the wordmark using text or substitute an academic icon for the product logo. Use vertical artwork in spacious sign-in areas, horizontal artwork in headers/sidebar areas, and symbols only in compact contexts already identified as EDAYA. Minimum rendered artwork widths: vertical 88, horizontal 128, symbol 32. The wrapper reserves clear space; do not crop its padding. Favicons alone may use the symbol at platform-required 16/24/32px. No recoloring, stretching, shadows on the artwork, or text laid over it. White artwork belongs on a dark or royal-blue surface.

## Accessibility and preserved behavior

Preserve every existing destination, field, data item, control, permission condition, validation rule, loading signal, and action result. UI-only work must not change authentication clients, controllers, API payloads, redirects, route contracts, session handling, grants, business rules, or calculations. A visual limitation is not authorization for a new feature. Keep recognizable operational icons and native platform behaviors.

Target WCAG AA: ordinary text 4.5:1, large text and essential control boundaries 3:1; inactive controls remain recognizable. Pair semantic colors with text/icons. Provide persistent labels, visible keyboard focus, logical reading order, meaningful icon-button labels, 44–48px touch targets, FR/EN copy, and 200% text support. Test long names, large amounts, phone/tablet/desktop widths, landscape and keyboard-open forms. Do not hide essential information to fix an overflow.

## Tokens and implementation

The canonical platform-neutral manifest is `design-system/tokens.json`. Generate local CSS with `python3 scripts/brand-tokens.py`; check it with `--check`. The generated `apps/webapp/src/lib/design-system/tokens.css` is imported through the existing `app.css` entry point and consumed by Tailwind. Builds read committed local assets and never need a mobile checkout. A coordinated version change supplies the identical JSON snapshot to mobile. Never edit generated files directly.

Semantic token names are stable. Brand sky and amber primitives are decorative; `success`, `highlight`, `destructive`, and `sky` express independent state meanings. Keep the webapp light-only. The neutral manifest's dark values support mobile and do not introduce a web theme switch.

Use `font-display` for headings, `font-sans tabular-nums` for numbers. Metadata consumers use Inter directly. `font-mono` is reserved for actual code samples using the system monospace font. No additional font dependencies or raw visual colors in components. Scoped third-party calendar overrides consume the same semantic variables; never patch vendor CSS.

## Approved authentication composition

At widths of at least 1024px, `AuthSplitShell` presents an approximately 1040px composition: 40% quiet sky brand panel, 60% white form area. The brand panel contains the vertical EDAYA logo and localized school-workspace copy. Below 1024px, use a compact horizontal branded header above the form. Keep form content at most 420px wide, persistent labels, 48px inputs and submit controls, and a visible language selector. Content grows and the page scrolls; no fixed-height clipping.

Default to the shared passwordless sign-in form. `PasswordlessPanel` detects email or international phone input and uses the existing OTP, authenticator and recovery steps. Registration is a secondary link under the existing flag. Exactly one active form is visible; inactive signup/signin sections stay mounted, hidden and inert to retain drafts. The `panel`, `method`, and `stage` URL contract, navigation callbacks, browser history, refresh canonicalization and redirects remain unchanged. Do not introduce recovery or alternative authentication flows.

Password visibility is local presentation state with an accessible show/hide button. Preserve autofill, Enter submission, validation, field bindings and current disabled/busy conditions. Pending submission uses a spinner and localized action label without width jumps. Show errors adjacent to the form with `role=alert`. OTP stays a single paste-friendly field, with recipient confirmation, resend and change-email actions. Keep all signup fields, email verification stages, shared email binding, environment-controlled demo access, teacher-portal guidance and verified-email feedback.

Connection presentation has three states around the existing health check: neutral checking, available (no warning), unavailable (localized warning). Checking must never be displayed as failure and never enables authentication before the existing checks pass.

## Reuse and operational presentation

Preserve sidebar groups, school/year context selectors, list/card modes, filters, calendars, selection tools, URL drawers, and mutation modals. Sidebar uses white chrome and the horizontal logo; compact rail uses the symbol. Student/class and school context take precedence over decorative branding. Below 1024px, the same sidebar opens in a focus-managed modal sheet over full-width content; it starts closed, dismisses on navigation/Escape, and does not overwrite the desktop expansion preference. Header context controls wrap without removing school/year/period/language/account access.

| Surface | Required reuse / presentation |
|---|---|
| List route | `PageQuery`, `DataState`, `ListPageHeader`; heading → toolbar → collection hierarchy |
| Main/secondary filters | `FilterSelect` / `FilterPanel`; wrapping pill controls and search |
| Table/cards | `ListEntityTable`, `ListEntityCards`; white, bordered, rounded surfaces; readable rows; numbers aligned right and tabular |
| Selection | Existing row selection and `ListSelectionBar`; preserve exports and bulk actions |
| Drawer | Existing URL-driven detail shell and shared drawer chrome; full width on phone; read-only content, clear sections |
| Mutation | `FormModal`, `ConfirmModal`, `PickerModal`, permission gates; keep all fields and actions |
| Feedback | `DataState`, `ToastHost`, `BADGE_*` tone presets and existing status maps; success has its own tone |
| Brand | `BrandLogo`; official horizontal/vertical/symbol variants and color/white tones |

Use the existing Bits UI primitives (Button, Input, Label, Textarea, Select, Checkbox, Dialog, Popover) and Lucide exports from `$lib/icons`. Tables retain readable columns in a keyboard-focusable horizontal scroll region at narrow widths; never squeeze names and labels into overlapping columns. Lists retain their information density; improve grouping with space and borders, not extra cards around each label. Keep main filters as selects, drawer tabs as existing route links, drawers read-only, and create/edit/delete in existing modals. Simple entities retain their row action menus. Primary actions remain in the entity header, subcollection additions in section headers. Never move these actions solely for a visual preference.

Neutral card → subtly tinted section → neutral overlay forms the surface hierarchy. Field boundaries use the stronger input token, dividers the border token. Toolbars wrap; dialogs and drawers scroll; popovers retain keyboard and dismissal behavior. Disabled and busy styles use the existing signals. Avoid fixed text heights, truncated important values, and purely color-based statuses.

For dialogs with a persistent header and footer, use a bounded flex column with a scrollable middle region. Never combine a clipped outer dialog with unscrollable content that pushes actions outside the viewport. Verify the account dialog at short desktop and phone heights as well as with enlarged text.

## Future UI review contract

Before adding UI: inventory existing T0/T1/T2/Smart components, extend their variants where needed, and keep single-feature markup route-local. New shared components require demonstrated reuse across at least three features. Review component states (default, hover, focus, pressed/selected, disabled, busy, error, empty) in the component gallery.

A visual exception must identify its affected component, why existing variants cannot serve it, accessibility evidence, owner, and intended lifetime. Obtain design review of the concrete proposal before adding the exception to the manifest or literal allowlist. No silent per-screen palette or typography forks.

A design-system change updates the versioned manifest, generated outputs, font/asset inventory, this specification, component registry, human brief, and current visual evidence together. Run token/asset/literal checks and `bun run verify`. Validate FR/EN, responsive widths, keyboard focus, text enlargement, reduced motion and existing authentication journeys. Review diffs for any unintended logic or permission changes. Current galleries identify source revision, dirty source digest, token version, viewport, locale and theme; temporary before/after material stays outside durable galleries.

The development-only demo account picker uses `AuthScreenShell`, the existing Button primitive, brand initials and localized staff roles. Selecting an account prefills the shared passwordless form and requires the usual explicit send and verification actions. Show a localized action to return to the picker.
