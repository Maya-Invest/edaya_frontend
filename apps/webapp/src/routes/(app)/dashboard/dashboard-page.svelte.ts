import type { SchoolOverviewResponse } from '$lib/api/dashboard-data';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { DashboardPageSlice } from './lib/dashboard-helpers';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadDashboardSlice, queryDashboardListPage } from './lib/dashboard-queries';

const DASHBOARD_VERSION_FAMILIES = ['attendance'] as const satisfies readonly EntityVersionKey[];

const DASHBOARD_PAGE_STATE_KEY = Symbol('dashboard-page-state');

export type { DashboardPageSlice };

export class DashboardPageState {
	slice = $state<DashboardPageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(DASHBOARD_VERSION_FAMILIES);

	applySlice(data: DashboardPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get overview(): SchoolOverviewResponse | null {
		return this.slice?.overview ?? null;
	}

	queryListPage() {
		return queryDashboardListPage(this);
	}

	async refreshSlice() {
		const data = await loadDashboardSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}
}

export function setDashboardPageState(state: DashboardPageState) {
	setContext(DASHBOARD_PAGE_STATE_KEY, state);
}

export function getDashboardPageState() {
	return getContext<DashboardPageState>(DASHBOARD_PAGE_STATE_KEY);
}
