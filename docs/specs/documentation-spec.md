# Documentation Spec

Normative. This contract governs the staff frontend's specification set, its authority and its relationship to engineering documentation. **Must** and **must not** are requirements. **May** grants only the explicitly stated choice.

## 1. Maintained documentation

### 1.1 Specs

`docs/` must contain exactly the six Markdown contracts in §2, under `docs/specs/`. Specs define the required product and architecture in present tense. They must not contain implementation status, correction backlogs, migration plans, changelogs or dated qualification claims.

The six-spec set must be self-contained: each concern must state its requirements directly, without requiring archived plans, implementation reports or external evidence. Cross-spec references may identify the owning contract; necessary repeated context must agree with it. Source paths and interface names may identify an architectural boundary; the presence or absence of a component in the implementation does not establish the norm. Requirements must occupy their owning sections, not appended amendments.

A requirement must name its subject, required behavior, applicable condition and observable result. “Appropriate layout,” “as needed,” “hide or disable,” and similar unresolved alternatives must not substitute for a decision. An optional capability must state the exact condition under which it appears.

### 1.2 Engineering READMEs

Engineering procedures belong in the README nearest their owner:

| Owner | Content |
| --- | --- |
| Repository root | Overview, setup, common commands and guide navigation |
| Repository tooling | CLI reference, client preparation, verification and releases |
| Each application | Configuration, responsibilities and development |
| Tests | Test authoring, fixtures, coverage and capture procedures |
| Design system | Token/asset maintenance and visual review procedure |
| Component/module | Local interfaces and examples |

READMEs may link to specs. They must not establish competing UI or domain requirements. The generated CLI reference must stay inside the tooling README's marked block and be produced by its generator.

### 1.3 External artifacts

Plans, audits, implementation gaps, reconciliation reports, client delivery material and historical evidence belong outside repositories. Shared standalone agent outputs and scripts belong in the workspace `bin/`; existing external archives retain their own organization. No build or check may depend on a local archive or `bin/` path.

Before removing source material, its archive must preserve original paths, repository/commit identity, working-tree status, checksums and dispositions. Copies must be verified. Archival must not mark unresolved work complete.

Generated runtime, test and screenshot evidence must use ignored output directories and identify source revision/fingerprint, conditions and outcomes. Evidence establishes what was observed, not what the product must do.

## 2. Six concerns

| Spec | Authority |
| --- | --- |
| `documentation-spec.md` | Normative language, ownership, precedence and exception governance |
| `feature-architecture-spec.md` | Domain meaning, capabilities, permissions, required information and feature surface assignments |
| `app-shell-spec.md` | Page, collection, drawer, form and workspace composition and interaction |
| `shared-components-spec.md` | Reusable component responsibilities, interfaces and allowed variants |
| `design-language-spec.md` | Visual measurements, state presentation and FR/EN writing |
| `route-state-spec.md` | Addressability, state ownership, loading, mutations and return context |

The root agent index and one Cursor rule per concern must point to this set. Summaries, examples and agent shortcuts must not override normative requirements.

### 2.1 Authority by concern

Domain contracts determine what information, actions, permissions, calculations and transaction semantics exist. Shared UI contracts determine how those capabilities are presented and operated. Route-state contracts determine their state and navigation behavior. A feature-specific paragraph does not automatically override a shared presentation or state requirement. Shared numerical geometry is owned exclusively by design-language §2–3, and collection row-state treatments by §3.1. Other specs must reference those sections rather than repeat generic measurements. Business quantities, transaction limits and named exception boundaries remain with their owning contracts. Open record, bulk selected and keyboard focus name independent states; ‘selected row’ must not ambiguously combine them.

UI composition must not implicitly invent backend capabilities, imply unsupported atomic saves or relax authorization. An explicitly required new capability must be declared by the feature contract with its public information boundary and authorization requirements; its declaration must not be presented as evidence of an existing API. Activity-log browsing requires such an authorized public audit projection; internal command receipts are not that projection. Implementation habits do not override the norm. An apparent conflict must be resolved in the owning requirements, not by selecting whichever wording is most convenient.

### 2.2 Named exceptions

A departure from a shared rule must have a stable `X-…` identifier and record:

1. The exact affected routes, surfaces or components.
2. The shared rule being replaced.
3. The replacement composition or behavior, including state and accessibility requirements.
4. The domain or task justification.
5. The rules that remain applicable.

An exception must be bounded; “this feature is special” is insufficient. Its identifier and short operative rule must appear wherever needed to keep a spec self-contained. Unnamed per-feature variants are forbidden. Changes to an exception must update all affected contracts together.

## 3. Feature contract completeness

Every accessible route family, including account/authentication and specialized configuration/task surfaces, must have an explicit contract. Sub-entities must have a declared parent owner. Aliases must have one canonical destination.

Each feature contract must establish:

| Decision | Required content |
| --- | --- |
| Scope | Parent record, school/year/term and permission boundaries |
| Collection | List, Table, allowed alternate, ordering and available search/facets |
| Inspection | No drawer, section drawer, tabbed drawer or named specialized composition; useful inspection purpose |
| Content | Ordered sections/tabs, required fields, conditional information and disclosures |
| Actions | Scope, label, authoritative location, eligibility and outcome |
| Editing | Bounded form, confirmation or focused task workspace; save granularity |
| States | Loading, empty, restricted, unavailable, failure and pending behavior |
| Continuity | Opening, Back, Close, direct-link return, preserved context and dirty dismissal |

A shared default may satisfy a decision only when the feature explicitly inherits the named contract and identifies its data and actions. A broad label such as “complex entity” is not a content contract. Empty authorized data must remain distinct from denied access.

## 4. Norm acceptance

The six contracts must use consistent terminology, dimensions, action ownership, exception identifiers and surface assignments. Each shared requirement must have an owner; necessary repeated context must agree with it. Navigation grouping must not merge recipient identities, broaden grants or combine counts with different meanings. Account section state must remain separate from school business authority; audit-read authority must not imply access to sensitive record contents.

Acceptance must cover representative List and Table pages, section/tabbed drawers, collection-only records, forms, focused workspaces and named specialized surfaces. Review scenarios must include FR/EN, keyboard operation, narrow screens, 200% text, long values, zero/unknown/restricted data, empty results, failures, pending writes and direct links.

References and section numbers must resolve. No route family or presentation choice may be left to an implementer's preference. Spec acceptance must not claim implementation, browser or release qualification.

## 5. Authorization boundaries

Staff role labels and profile names must not establish authority. Typed grants, valid scopes and backend eligibility determine actions and reads. Portal teachers, guardians and students remain distinct actors; staff administration must not confer portal authority implicitly. Forbidden optional enrichment must degrade to Restricted without exposing hidden values or treating the record as absent.
