# Agent guidance

## UI architecture

When working on `apps/webapp` screens, layouts, drawers, or modals, follow:

- **[specs/app-shell-spec.md](specs/app-shell-spec.md)** — interaction patterns (list, drawer, modals)
- **[docs/reference/ui-architecture-reference.md](docs/reference/ui-architecture-reference.md)** — per-feature screen catalog (routes, entities, filters, drawer tabs, API gaps)
- **[specs/design-language-spec.md](specs/design-language-spec.md)** — visual design (colors, typography, components)
- **[specs/data-loading-spec.md](specs/data-loading-spec.md)** — route-scoped loading, entity store, optimistic mutations

Key rules (summary):

- List + URL-backed detail drawer + mutation modals
- Drawer is read-only; edits via action buttons → modals
- Sub-collection tabs: read-only lists; add/edit always modal
- Pragmatic inline toggles only for boolean/single-value fields
- Use `DataState` for loading/empty/error; toast on mutations

Cursor rule: `.cursor/rules/app-shell.mdc` (applies when editing `apps/webapp/**`).
