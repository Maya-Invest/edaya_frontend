# Agent guidance

## UI architecture

When working on `apps/webapp` screens, layouts, drawers, or modals, follow:

- **[docs/sprints/v1-staff-webapp-implementation-plan.md](docs/sprints/v1-staff-webapp-implementation-plan.md)** — phased implementation plan (execute work)
- **[specs/v1-feature-architecture-spec.md](specs/v1-feature-architecture-spec.md)** — **what** to build (modules, routes, entities, locked UX decisions)
- **[specs/app-shell-spec.md](specs/app-shell-spec.md)** — **how** to build interaction patterns (list, drawer, modals)
- **[docs/reference/ui-architecture-reference.md](docs/reference/ui-architecture-reference.md)** — per-feature catalog, gap tracker, sprint progress (not normative)
- **[specs/design-language-spec.md](specs/design-language-spec.md)** — visual design (colors, typography, components)
- **[specs/data-loading-spec.md](specs/data-loading-spec.md)** — route-scoped loading, entity store, optimistic mutations

Key rules (summary):

- List + URL-backed detail drawer + mutation modals
- Drawer is read-only; edits via action buttons → modals
- Sub-collection tabs: read-only lists; add/edit always modal
- Pragmatic inline toggles only for boolean/single-value fields
- Use `DataState` for loading/empty/error; toast on mutations

Cursor rules (auto-attached when editing `apps/webapp/**`):

- `.cursor/rules/v1-feature-architecture.mdc` — normative v1 routes, entities, locked UX
- `.cursor/rules/app-shell.mdc` — list, drawer, modal interaction patterns
