# Svelte State Spec

> **Applies to:** `apps/webapp`

**Goal:** Components = UI wiring. Heavy logic = class-based `$state` in `.svelte.ts`.

---

## Three tiers

| Tier | What | Where | Lifetime |
|------|------|-------|----------|
| **1 — Session** | Auth, shell, entity store (`detailDataContext`), domain stores (`reportCardsContext`, `teachingLogContext`) | `lib/**/context.svelte.ts` singleton | App session |
| **2 — Feature** | Selection, orchestration, shared screen logic | `lib/<domain>/<feature>-state.svelte.ts` + context | Route subtree |
| **3 — UI** | Modal open, local draft, visual flags | Component `<script>` | Component |

**Rule:** I/O, multi-component logic, or testable behavior → **not** Tier 3.

**Testing:** State classes are plain TypeScript — unit-test methods and getters with Vitest (`new FeatureState()`, mock store/API deps) without mounting Svelte components.

---

## Class pattern (Tier 2)

```ts
// lib/fees/fee-billing-state.svelte.ts
import { getContext, onDestroy, setContext } from 'svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';

const KEY = Symbol('FeeBillingState');

export class FeeBillingState {
	selectedId = $state('');
	loading = $state(false);

	get selected() {
		return detailDataContext.fees.find(f => f.id === this.selectedId);
	}

	constructor() {
		onDestroy(() => { /* timers / abort */ });
	}

	async orchestrateExport() { /* calls runMutation / API; no raw fetch */ }
	select(id: string) { this.selectedId = id; }
}

export function setFeeBillingState() {
	return setContext(KEY, new FeeBillingState());
}

export function getFeeBillingState() {
	return getContext<FeeBillingState>(KEY);
}
```

**Class rules:** `$state` fields · getters for derived · arrow methods for handlers · cleanup in `constructor` · no `$effect` in class · **no HTTP fetch in Tier 2** — route `query*Page` seeds the store; Tier 2 orchestrates selection and UI flow only.

**Parent:** `setFeeBillingState()` in layout/route. **Children:** `getFeeBillingState()`.

**Tier 1 singletons** (`academicContext`, `detailDataContext`): `export const x = new X()` — one instance per session, not per layout.

---

## Component script (Tier 3 only)

```svelte
<script lang="ts">
	import { getFeeBillingState } from '$lib/fees/fee-billing-state.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';

	const billing = getFeeBillingState();
	let createOpen = $state(false);
	const rows = $derived(detailDataContext.fees);
</script>
```

**Keep in component:** modal flags, form binding inside modals, CSS/focus.

**Move out:** fetch, business rules, shared selection, debounce/pagination.

---

## Data and I/O boundaries

| Concern | Owner | Location |
|---------|--------|----------|
| Entity records | `detailDataContext` (alias `entityStore`) | `lib/detail-data/context.svelte.ts` |
| Shell selectors | `academicContext` | `lib/academic/context.svelte.ts` |
| Route fetch + seed | `query*Page` functions | `lib/queries/*.queries.ts` |
| Writes | `runMutation` with `apply` / `rollback` | `lib/api/mutations/run-mutation.ts` |
| Selection, wizard step, export in flight | Feature state class (Tier 2) | `lib/<domain>/*-state.svelte.ts` |

**Route load pattern:** each list route uses `PageQuery` wrapping a `query*Page` function. Inside `load`, fetch scoped API data and call `detailDataContext.seed*`. Views render from the store — not from ephemeral query results.

**Mutation pattern:** snapshot affected record → `runMutation(apiCall, { apply, rollback, successMessage })` → patch store optimistically → rollback snapshot on error.

**Do not duplicate entity arrays in feature state** — read `detailDataContext`, coordinate selection and UI flags around it.

---

## SSR

- No user-specific mutable module `$state` during SSR.
- Guard `localStorage` with `browser`.
- Reset feature state on route param change.

---

## Anti-patterns

| Do not | Do instead |
|--------|------------|
| Fetch in component `$effect` | `query*Page` + store |
| Entity copies in feature state | Read `detailDataContext` |
| `onclick={state.reset}` | `() => state.reset()` or arrow method |
| God class replacing entity store | Store = data, state = coordination |

---

## Agent checklist

- [ ] Tier 1/2/3 classified
- [ ] Entities read/written via `detailDataContext` — `query*Page` for load, `runMutation` for writes
- [ ] Heavy logic in `*-state.svelte.ts`
- [ ] `set*` / `get*` context when shared in subtree
- [ ] Mutations via `runMutation`
- [ ] Reset on scope change
- [ ] Non-trivial Tier 2 logic has `*.test.ts` against the state class (not the component)

---

## Extraction threshold

Extract Tier 2 `*-state.svelte.ts` when a `*View.svelte` script exceeds **~60 lines** of non-markup logic, or when two sibling components share orchestration. Keep modal open flags and form bindings in Tier 3.

---

## Repo references

- `lib/detail-data/context.svelte.ts` — entity store (Tier 1)
- `lib/academic/context.svelte.ts` — shell selectors (Tier 1)
- `lib/report-cards/context.svelte.ts` — report card domain store (Tier 1)
- `lib/teaching-log/context.svelte.ts` — teaching log domain store (Tier 1)
- `lib/drawer.svelte.ts` — legacy non-URL drawer selection for config surfaces; prefer URL-backed `[[id]]` drawers for entity routes
- `routes/(app)/+layout.svelte` — shell layout; set feature context here when needed
- `lib/components/school/students/StudentsView.svelte` — thin component (Tier 3)
