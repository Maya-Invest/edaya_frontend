# EDAYA UI brief

Design system: **1.0.0**. Audiences: school staff in the web workspace, teachers in the Teacher app, families in Guardian. This is the human-facing brief; platform design-language specifications are the implementation contracts.

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

## What remains familiar

The staff webapp retains its sidebar groups, school/year selectors, list/card modes, filters, drawers and mutation modals. Guardian retains Calendar, Academic, Evaluations, Fees and Inbox. Teacher retains Calendar, Evaluations, Teaching and Report Cards, including attendance gestures and editing workflows. Working structures should remain recognizable. On small screens, staff navigation opens over the page so content retains its full width; existing context controls remain available.

The redesigned web sign-in emphasizes one task at a time: a quiet 40% brand panel and 60% form area on desktop, compact branding on smaller screens, password sign-in first, email-code access alongside it, and registration as a secondary link. The enabled-method registry and registration/demo flags still decide what appears. There are no new authentication flows.

## Current examples and review

[Staff webapp gallery](design-review/README.md) · [Web specification](../specs/design-language-spec.md). The mobile repository carries its self-contained specification at `docs/specs/design-language-spec.md` and current galleries at `apps/guardian/design-review` and `apps/teacher/design-review`.

The current web gallery and mobile app galleries identify their source, fixture provenance and viewing conditions. Calendar examples demonstrate current navigation and class/student context; Guardian fees demonstrate wrapping amounts; Teacher attendance/marks examples demonstrate readable status and locked controls. Component compositions are explicitly identified separately from full production pages. Review annotations explain which established structures were retained and which presentation changed.

## Reuse checklist

- Find the existing primitive or feature component before introducing a new one.
- Use the approved font, semantic token, spacing and geometry roles.
- Preserve all information, permission conditions, validation and actions.
- Show default, focus, selected, disabled, busy, error and empty states where applicable.
- Provide FR/EN, responsive and enlarged-text evidence; include mobile dark mode.
- Update tokens, platform specs, component registry and current examples together.

For an exception, record the component, need, alternatives, owner and lifetime, and attach visual/accessibility evidence. Review the concrete exception before changing shared foundations or adding an allowlisted visual literal. Historical feature proposals do not grant approval to expand this rebrand.
