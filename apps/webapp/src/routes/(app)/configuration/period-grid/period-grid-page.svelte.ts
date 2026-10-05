import type { PeriodDefinition } from '$lib/types/school';
import type { PeriodGridPageSlice } from './lib/period-grid-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { savePeriodDefinitionMutation, savePeriodDefinitionsBatchMutation } from '$lib/api/mutations/period-definition.mutations';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadPeriodGridSlice, queryPeriodGridPage } from './lib/period-grid-queries';
import { deletePeriodDefinitionMutation } from './lib/period-grid-route-mutation';
import { readPeriodGridYear, writePeriodGridYear } from './lib/period-grid-year';

const PERIOD_GRID_PAGE_STATE_KEY = Symbol('period-grid-page-state');

export type { PeriodGridPageSlice };

export class PeriodGridPageState {
	performSavePeriodDefinition = (...args: Parameters<typeof savePeriodDefinitionMutation>) => savePeriodDefinitionMutation(...args);

	performSavePeriodDefinitionsBatch = (...args: Parameters<typeof savePeriodDefinitionsBatchMutation>) => savePeriodDefinitionsBatchMutation(...args);

	slice = $state<PeriodGridPageSlice | null>(null);
	selectedYearId = $state<string | null>(academicContext.yearId || null);

	private readonly versions = new RouteVersionSnapshot(['periodDefinitions']);

	constructor(private readonly getUrl: () => URL) {}

	applySlice(data: PeriodGridPageSlice) {
		this.slice = data;
		this.hydrateSelectedYear();
		this.versions.markLoaded();
	}

	hydrateSelectedYear() {
		const url = this.getUrl();
		const allowedYearIds = [...academicContext.years]
			.sort((a, b) => b.startDate.localeCompare(a.startDate))
			.map(year => year.id);
		const selectedYearId = readPeriodGridYear(
			url,
			allowedYearIds,
			academicContext.yearId || null,
		);
		this.selectedYearId = selectedYearId;
		const canonicalHref = writePeriodGridYear(url, selectedYearId);
		if (canonicalHref !== `${url.pathname}${url.search}`) {
			void appGoto(canonicalHref, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
		}
	}

	setSelectedYear(yearId: string | null) {
		this.selectedYearId = yearId;
		const href = writePeriodGridYear(this.getUrl(), yearId);
		if (href === `${this.getUrl().pathname}${this.getUrl().search}`) {
			return;
		}
		void appGoto(href, {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
		});
	}

	clear() {
		this.slice = null;
	}

	queryListPage() {
		return queryPeriodGridPage(this);
	}

	async refreshSlice() {
		const data = await loadPeriodGridSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async deletePeriodDefinition(input: {
		periodDefinition: PeriodDefinition;
		successMessage?: string;
	}): Promise<boolean> {
		const ok = await deletePeriodDefinitionMutation(input.periodDefinition.id, {
			successMessage: input.successMessage,
		});
		if (!ok) {
			return false;
		}
		await this.refreshSlice();
		return true;
	}
}

export function setPeriodGridPageState(state: PeriodGridPageState) {
	setContext(PERIOD_GRID_PAGE_STATE_KEY, state);
}

export function getPeriodGridPageState() {
	return getContext<PeriodGridPageState>(PERIOD_GRID_PAGE_STATE_KEY);
}
