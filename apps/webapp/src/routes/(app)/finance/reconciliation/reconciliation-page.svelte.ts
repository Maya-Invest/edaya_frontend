import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { ReconciliationPageSlice } from './lib/reconciliation-helpers';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadReconciliationSlice, queryReconciliationPage } from './lib/reconciliation-queries';

const RECONCILIATION_VERSION_FAMILIES = ['billing', 'payments'] as const satisfies readonly EntityVersionKey[];

const RECONCILIATION_PAGE_STATE_KEY = Symbol('reconciliation-page-state');

export type { ReconciliationPageSlice };

export class ReconciliationPageState {
	slice = $state<ReconciliationPageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(RECONCILIATION_VERSION_FAMILIES);

	applySlice(data: ReconciliationPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get reconciliation() {
		return this.slice?.reconciliation ?? null;
	}

	queryListPage() {
		return queryReconciliationPage(this);
	}

	async refreshSlice() {
		const data = await loadReconciliationSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}
}

export function setReconciliationPageState(state: ReconciliationPageState) {
	setContext(RECONCILIATION_PAGE_STATE_KEY, state);
}

export function getReconciliationPageState() {
	return getContext<ReconciliationPageState>(RECONCILIATION_PAGE_STATE_KEY);
}
