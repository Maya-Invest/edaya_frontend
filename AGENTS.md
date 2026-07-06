# Agent guidance

## UI architecture

When working on `apps/webapp` screens, layouts, drawers, or modals, follow:

- **[docs/sprints/demo-ready-plan.md](docs/sprints/demo-ready-plan.md)** — **demo sprint** — script, dry-run, scene readiness
- **[docs/sprints/remaining-work-plan.md](docs/sprints/remaining-work-plan.md)** — **active backlog** — carry-over from archived v1 / backend / state plans
- **[specs/v1-feature-architecture-spec.md](specs/v1-feature-architecture-spec.md)** — **what** to build (modules, routes, entities, locked UX decisions)
- **[specs/app-shell-spec.md](specs/app-shell-spec.md)** — **how** to build interaction patterns (list, drawer, modals)
- **[specs/shared-components-spec.md](specs/shared-components-spec.md)** — **reusable components** (mandatory registry, composition)
- **[docs/reference/ui-architecture-reference.md](docs/reference/ui-architecture-reference.md)** — per-feature catalog, gap tracker, sprint progress (not normative)
- **[specs/design-language-spec.md](specs/design-language-spec.md)** — visual design (colors, typography, components)
- **[specs/data-loading-spec.md](specs/data-loading-spec.md)** — route-scoped loading, entity store, optimistic mutations
- **[specs/svelte-state-spec.md](specs/svelte-state-spec.md)** — class-based Svelte 5 state, context wiring, component boundaries
- **[docs/sprints/archive/svelte-state-alignment.md](docs/sprints/archive/svelte-state-alignment.md)** — archived state migration tracker (history); open items → [remaining-work-plan.md](docs/sprints/remaining-work-plan.md)

Key rules (summary):

- List + URL-backed detail drawer + mutation modals
- Compose from [shared-components-spec](specs/shared-components-spec.md) before adding new shared UI
- Drawer is read-only; edits via action buttons → modals
- Sub-collection tabs: read-only lists; add/edit always modal
- Pragmatic inline toggles only for boolean/single-value fields
- Use `DataState` for loading/empty/error; toast on mutations

Cursor rules (auto-attached when editing `apps/webapp/**`):

- `.cursor/rules/v1-feature-architecture.mdc` — normative v1 routes, entities, locked UX
- `.cursor/rules/app-shell.mdc` — list, drawer, modal interaction patterns
- `.cursor/rules/shared-components.mdc` — mandatory reusable components
- `.cursor/rules/svelte-state.mdc` — class-based state tiers and context wiring
