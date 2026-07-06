# Svelte State Spec

> **Applies to:** `apps/webapp`  
> **Pairs with:** [data-loading-spec.md](./data-loading-spec.md) (entity store, queries, mutations)

**Goal:** Components = UI wiring. Heavy logic = class-based `$state` in `.svelte.ts`.

---

## Three tiers

| Tier | What | Where | Lifetime |
|------|------|-------|----------|
| **1 — Session** | Auth, shell, entity store (`detailDataContext`) | `lib/**/context.svelte.ts` singleton | App session |
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

	async load() { /* orchestration */ }
	select(id: string) { this.selectedId = id; }
}

export function setFeeBillingState() {
	return setContext(KEY, new FeeBillingState());
}

export function getFeeBillingState() {
	return getContext<FeeBillingState>(KEY);
}
```

**Class rules:** `$state` fields · getters for derived · arrow methods for handlers · cleanup in `constructor` · no `$effect` in class.

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

## Data-loading split

| Concern | Owner |
|---------|--------|
| Entity records | `detailDataContext` / domain stores |
| Route fetch + seed | `query*Page` |
| Writes | `runMutation` → patch store |
| Selection, wizard step, export in flight | Feature state class |

**Do not duplicate entity arrays in feature state** — read the store, coordinate around it.

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
- [ ] Entities via entity store (data-loading spec)
- [ ] Heavy logic in `*-state.svelte.ts`
- [ ] `set*` / `get*` context when shared in subtree
- [ ] Mutations via `runMutation`
- [ ] Reset on scope change
- [ ] Non-trivial Tier 2 logic has `*.test.ts` against the state class (not the component)

---

## Repo references

- `lib/detail-data/context.svelte.ts` — entity store (Tier 1)
- `lib/academic/context.svelte.ts` — shell selectors (Tier 1)
- `lib/drawer.svelte.ts` + `routes/(app)/+layout.svelte` — layout-scoped context (Tier 2)
- `lib/components/school/students/StudentsView.svelte` — thin component (Tier 3)

---

## Related specs

- [data-loading-spec.md](./data-loading-spec.md)
- [demo-ready-plan.md](../sprints/demo-ready-plan.md) — active sprint tracker
- [svelte-state-alignment.md](../sprints/archive/svelte-state-alignment.md) — archived migration history
- [app-shell-spec.md](./app-shell-spec.md)
- [shared-components-spec.md](./shared-components-spec.md)
