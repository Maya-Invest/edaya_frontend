# Agent guidance

`apps/webapp` implementation is governed by **six normative specs** in `docs/specs/`. Read `documentation-spec.md` first for how docs are organized.

## Spec index

| Spec | Scope |
|------|-------|
| [documentation-spec.md](docs/specs/documentation-spec.md) | Doc taxonomy — specs vs reference vs plans |
| [feature-architecture-spec.md](docs/specs/feature-architecture-spec.md) | Routes, modules, entities, domain UX |
| [app-shell-spec.md](docs/specs/app-shell-spec.md) | List · drawer · modal interaction |
| [shared-components-spec.md](docs/specs/shared-components-spec.md) | Mandatory reusable components |
| [design-language-spec.md](docs/specs/design-language-spec.md) | Visual design tokens and patterns |
| [route-state-spec.md](docs/specs/route-state-spec.md) | URL-driven loading · route state · mutations · colocation |

## Cursor rules

One rule per spec. Auto-attached by glob when relevant files are edited:

| Rule | Spec | Globs |
|------|------|-------|
| `.cursor/rules/documentation.mdc` | `documentation-spec.md` | `docs/**`, `AGENTS.md`, `.cursor/rules/**` |
| `.cursor/rules/feature-architecture.mdc` | `feature-architecture-spec.md` | `apps/webapp/**` |
| `.cursor/rules/app-shell.mdc` | `app-shell-spec.md` | `apps/webapp/**` |
| `.cursor/rules/shared-components.mdc` | `shared-components-spec.md` | `apps/webapp/**` |
| `.cursor/rules/design-language.mdc` | `design-language-spec.md` | `apps/webapp/**` |
| `.cursor/rules/route-state.mdc` | `route-state-spec.md` | `apps/webapp/**` |

## Quick invariants

- **Staff workspace scope** — School → Teachers, Students, Guardians, assignments, invites, and related drawers/modals are first-class features.
- **Portal vs staff** — portal teachers, guardians, and students do not sign in through the staff webapp; staff **manage** those actors here.
- **Interaction** — list + URL-backed detail drawer (complex entities) + mutation modals; simple entities use row `···` only.
- **Mutations** — drawer is read-only; create/edit/delete via modals; pragmatic inline toggles only for boolean/single-value fields.
- **Data** — `PageQuery` seeds route state from URL; `runMutation` with optimistic patch + version bump; `DataState` for loading/empty/error; toast on mutations.

## Operational commands

Use `bun repo --help` for repository commands. Keep human-facing reference documents separate from normative agent instructions.

- **EDAYA UI 1.0.0** — royal blue, sky canvas, bundled Poppins headings and Inter UI. Use supplied logos, generated tokens and existing primitives. Preserve logic and effective layouts. Update design specs, token version and current visual evidence together.

## Verification

Before opening a PR:

```sh
bun run verify        # repo hygiene, then quality + build + unit tests
```

Ad-hoc Turbo iteration: `bun run lint`, `bun run check`, `bun run test`, etc. Repo hygiene only: `bun repo verify`.
