# Documentation Spec

> **Applies to:** `edaya_web` documentation and agent configuration  
> **Audience:** AI agents and implementers

This document defines how documentation in this repository is organized. Agents **must** follow this taxonomy when reading or updating docs.

---

## 1. Document types

Three types exist. Do not mix concerns across types.

### 1.1 Specs (`docs/specs/`)

Canonical, normative contracts for agents.

Each spec:

- Defines **one concern** completely within its scope
- Does **not** link to or depend on any other document (including other specs, reference docs, or plans)
- Is precise and implementation-ready
- Is updated when architecture decisions change

**Agent entry point:** the repository root `AGENTS.md` file indexes the spec set. Cursor rules under `.cursor/rules/` use **one rule file per spec** — each points to exactly one spec document.

### 1.2 Reference (`docs/reference/`)

Human-targeted architecture notes, decision logs, catalogs, and operational guides.

Each reference doc:

- Is self-contained for human readers
- May discuss rationale, progress, and historical context
- Is **not** normative for agents

**Must not** be linked from `AGENTS.md`, `.cursor/rules/`, or any spec file.

### 1.3 Plans (`docs/sprints/`)

Proposals and implementation trackers with a lifecycle:

| Stage | Meaning |
|-------|---------|
| **planned** | Proposed work, not started |
| **on-going** | Active execution and checkbox tracking |
| **done** | Delivered; tracker frozen |
| **archived** | Historical; open items extracted to a newer plan if needed |

Plan docs **must not** be linked from specs, reference docs, or agent configuration.

---

## 2. Agent spec set

These six documents are the **only** normative sources for agents working on `apps/webapp`:

| Spec | Scope |
|------|-------|
| `feature-architecture-spec.md` | Routes, modules, entities, domain UX rules |
| `app-shell-spec.md` | List, drawer, modal interaction patterns |
| `shared-components-spec.md` | Mandatory reusable component registry |
| `design-language-spec.md` | Visual design tokens and patterns |
| `route-state-spec.md` | URL-driven loading, route state, mutations, colocation, smart components |
| `documentation-spec.md` | This taxonomy and doc hygiene rules |

When multiple specs apply to a task, read each relevant spec independently. The root `AGENTS.md` file is an index only — not a substitute for reading the specs.

### 2.1 Conflict resolution

When rules appear to overlap, **precedence** is:

| Priority | Spec | Wins for |
|----------|------|----------|
| 1 | `feature-architecture-spec.md` | Routes, entity surface type (complex/simple/thin/layout), locked product decisions |
| 2 | Concern-specific spec | Interaction (`app-shell`), components (`shared-components`), visuals (`design-language`) |
| 3 | `route-state-spec.md` | Data loading, route state ownership, mutations, colocation — wins over legacy patterns in code |
| 4 | Heuristics in app-shell | Classifying **new** entities only — never overrides an assigned surface in feature-architecture §3 / §8 |

Codebase drift does not override specs. Align code to specs in dedicated PRs.

### 2.2 Multi-spec changes

Architecture or UX changes that span concerns **must** update every affected spec in the same PR (e.g. new drawer pattern → `app-shell` + `shared-components`; new route → `feature-architecture` + `route-state`).

---

## 3. Rules for agents

1. **Start at the root `AGENTS.md` file** — it lists the spec set and cursor rules.
2. **Specs are law** — do not treat reference or plan docs as requirements.
3. **Spec vs code** — when they disagree, fix code or amend the relevant spec in the same PR.
4. **No cross-links in specs** — if context from another concern is needed, state it inline briefly; do not link out.
5. **Do not update reference or plans** unless the user explicitly asks for human-facing tracker work.

---

## 4. Rules for humans

1. **Architecture changes** — update the relevant spec first, then code, in the same PR when possible.
2. **Progress and gaps** — track in reference docs or plans, not in specs.
3. **Plan lifecycle** — move trackers to `archived/` when done; carry open items forward in a new on-going plan.
4. **Agent config hygiene** — keep the root `AGENTS.md` and `.cursor/rules/` limited to the spec set above.

---

## 5. Portal authorization caution

Staff permission, role, scope, and seed changes in `edaya_backend` can regress **portal authorization** (teacher assignments, guardian links, student access).

When touching grants, seeds, or `StaffPermissionAssignment` in either repo:

- Verify portal actor data still resolves in webapp screens (timetable labels, teacher drawer)
- Ensure enrichment reads degrade gracefully on 403

This applies across repos; it is not tracked in webapp plan docs.
