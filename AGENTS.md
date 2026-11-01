# Agent guidance

`apps/webapp` implementation is governed by **six normative specs** in `docs/specs/`. Read `documentation-spec.md` first for how docs are organized.

## Spec index

| Spec | Scope |
|------|-------|
| [documentation-spec.md](docs/specs/documentation-spec.md) | Specs, engineering READMEs and external archives |
| [feature-architecture-spec.md](docs/specs/feature-architecture-spec.md) | Routes, modules, entities, domain UX |
| [app-shell-spec.md](docs/specs/app-shell-spec.md) | List · drawer · modal interaction |
| [shared-components-spec.md](docs/specs/shared-components-spec.md) | Mandatory reusable components |
| [design-language-spec.md](docs/specs/design-language-spec.md) | Visual design tokens and patterns |
| [route-state-spec.md](docs/specs/route-state-spec.md) | URL-driven loading · route state · mutations · colocation |

## Cursor rules

One rule per spec. Auto-attached by glob when relevant files are edited:

| Rule | Spec | Globs |
|------|------|-------|
| `.cursor/rules/documentation.mdc` | `documentation-spec.md` | `docs/**`, `**/README.*`, `AGENTS.md`, `.cursor/rules/**` |
| `.cursor/rules/feature-architecture.mdc` | `feature-architecture-spec.md` | `apps/webapp/**` |
| `.cursor/rules/app-shell.mdc` | `app-shell-spec.md` | `apps/webapp/**` |
| `.cursor/rules/shared-components.mdc` | `shared-components-spec.md` | `apps/webapp/**` |
| `.cursor/rules/design-language.mdc` | `design-language-spec.md` | `apps/webapp/**` |
| `.cursor/rules/route-state.mdc` | `route-state-spec.md` | `apps/webapp/**` |

## Quick invariants

- **Staff workspace scope** — School → Teachers, Students, Guardians, assignments, invites, and related drawers/modals are first-class features.
- **Portal vs staff** — portal teachers, guardians, and students do not sign in through the staff webapp; staff **manage** those actors here.
- **Interaction** — list + URL-backed detail drawer (complex entities) + mutation modals; simple entities use row `···` only.
- **Mutations** — drawer is read-only; multi-field/destructive changes use modals; preserve the specs' explicit inline and workflow exceptions.
- **Data** — `PageQuery` seeds route state from URL; shared mutation runners bump domain versions and pair any optimistic patch with rollback; authoritative workflows wait for the server. Use `DataState` for loading/empty/error and feedback on mutations.

## Operational commands

Use `bun run repo --help` for repository commands. Prepare the backend client with `bun run repo generate client staging`, then run `bun run repo generate dependencies` and `bun run repo generate setup` before verification. Engineering guidance lives in colocated READMEs; historical material and gap reports stay outside the repository.

- **EDAYA UI 1.0.0** — royal blue, sky canvas, bundled Poppins headings and Inter UI. Use supplied logos, generated tokens and existing primitives. Preserve logic and effective layouts. Update design specs, token version and current visual evidence together.

## Verification

Before opening a PR:

```sh
bun run verify        # repo/workflow checks, tooling tests, quality, build and unit tests
```

Ad-hoc Turbo iteration: `bun run lint`, `bun run check`, `bun run test`, etc. Repo hygiene only: `bun run repo check`.
