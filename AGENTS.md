# Agent guidance

`apps/webapp` implementation is governed by **seven normative specs** in `docs/specs/`. Read `documentation-spec.md` first for how docs are organized.

## Spec index

| Spec | Scope |
|------|-------|
| [documentation-spec.md](docs/specs/documentation-spec.md) | Doc taxonomy — specs vs reference vs plans |
| [feature-architecture-spec.md](docs/specs/feature-architecture-spec.md) | Routes, modules, entities, domain UX |
| [app-shell-spec.md](docs/specs/app-shell-spec.md) | List · drawer · modal interaction |
| [shared-components-spec.md](docs/specs/shared-components-spec.md) | Mandatory reusable components |
| [design-language-spec.md](docs/specs/design-language-spec.md) | Visual design tokens and patterns |
| [data-loading-spec.md](docs/specs/data-loading-spec.md) | Route loading · entity store · mutations |
| [svelte-state-spec.md](docs/specs/svelte-state-spec.md) | Svelte 5 state tiers and context wiring |

## Cursor rules

One rule per spec. Auto-attached by glob when relevant files are edited:

| Rule | Spec | Globs |
|------|------|-------|
| `.cursor/rules/documentation.mdc` | `documentation-spec.md` | `docs/**`, `AGENTS.md`, `.cursor/rules/**` |
| `.cursor/rules/feature-architecture.mdc` | `feature-architecture-spec.md` | `apps/webapp/**` |
| `.cursor/rules/app-shell.mdc` | `app-shell-spec.md` | `apps/webapp/**` |
| `.cursor/rules/shared-components.mdc` | `shared-components-spec.md` | `apps/webapp/**` |
| `.cursor/rules/design-language.mdc` | `design-language-spec.md` | `apps/webapp/**` |
| `.cursor/rules/data-loading.mdc` | `data-loading-spec.md` | `apps/webapp/**` |
| `.cursor/rules/svelte-state.mdc` | `svelte-state-spec.md` | `apps/webapp/**` |

## Quick invariants

- **Staff workspace scope** — School → Teachers, Students, Guardians, assignments, invites, and related drawers/modals are first-class features.
- **Portal vs staff** — portal teachers, guardians, and students do not sign in through the staff webapp; staff **manage** those actors here.
- **Interaction** — list + URL-backed detail drawer (complex entities) + mutation modals; simple entities use row `···` only.
- **Mutations** — drawer is read-only; create/edit/delete via modals; pragmatic inline toggles only for boolean/single-value fields.
- **Data** — `PageQuery` + `detailDataContext` for route load; `runMutation` with optimistic patch; `DataState` for loading/empty/error; toast on mutations.
