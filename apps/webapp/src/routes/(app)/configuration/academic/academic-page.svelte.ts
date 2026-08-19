import type { PeriodDefinition } from '$lib/types/school';
import type { AcademicPageSlice } from './lib/academic-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import {
	archiveAcademicYearMutation,
	createAcademicYearMutation,
	publishAcademicPeriodMutation,
	publishAcademicYearMutation,
} from '$lib/api/mutations/academic.mutations';
import { refreshAppShellData } from '$lib/api/mutations/run-mutation';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readAcademicAdminListFilters, writeAcademicAdminListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import {
	readExpandedAcademicYear,
	writeExpandedAcademicYear,
} from './lib/academic-expanded-year';
import { loadAcademicSlice, queryAcademicListPage } from './lib/academic-queries';
import { deletePeriodDefinitionMutation } from './lib/academic-route-mutation';

const ACADEMIC_VERSION_FAMILIES = [] as const;

const ACADEMIC_PAGE_STATE_KEY = Symbol('academic-page-state');

export type { AcademicPageSlice };

export class AcademicPageState {
	slice = $state<AcademicPageSlice | null>(null);
	expandedYear = $state<string | null>(academicContext.yearId);

	readonly filters: ListFiltersState<{ q: string; status: string }>;

	private readonly versions = new RouteVersionSnapshot(ACADEMIC_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeAcademicAdminListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readAcademicAdminListFilters(getUrl()),
		);
	}

	applySlice(data: AcademicPageSlice) {
		this.slice = data;
		this.hydrateExpandedYear();
		this.versions.markLoaded();
	}

	hydrateExpandedYear() {
		const url = this.getUrl();
		const allowedYearIds = academicContext.years.map(year => year.id);
		const expandedYear = readExpandedAcademicYear(
			url,
			allowedYearIds,
			academicContext.yearId,
		);
		this.expandedYear = expandedYear;
		const canonicalHref = writeExpandedAcademicYear(url, expandedYear);
		if (canonicalHref !== `${url.pathname}${url.search}`) {
			void appGoto(canonicalHref, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
		}
	}

	setExpandedYear(yearId: string | null) {
		this.expandedYear = yearId;
		const url = this.getUrl();
		const href = writeExpandedAcademicYear(url, yearId);
		if (href === `${url.pathname}${url.search}`) {
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
		return queryAcademicListPage(this);
	}

	async refreshSlice() {
		const data = await loadAcademicSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async createYear(input: {
		label: string;
		startDate: string;
		endDate: string;
		successMessage?: string;
	}): Promise<string | null> {
		const yearId = await createAcademicYearMutation(input.label, input.startDate, input.endDate, {
			successMessage: input.successMessage,
		});
		if (!yearId) {
			return null;
		}
		await refreshAppShellData();
		await this.refreshSlice();
		this.setExpandedYear(yearId);
		return yearId;
	}

	async publishYear(yearId: string): Promise<boolean> {
		const ok = await publishAcademicYearMutation(yearId);
		if (!ok) {
			return false;
		}
		await refreshAppShellData();
		await this.refreshSlice();
		return true;
	}

	async archiveYear(yearId: string): Promise<boolean> {
		const ok = await archiveAcademicYearMutation(yearId);
		if (!ok) {
			return false;
		}
		await refreshAppShellData();
		await this.refreshSlice();
		return true;
	}

	async publishPeriod(periodId: string): Promise<boolean> {
		const ok = await publishAcademicPeriodMutation(periodId);
		if (!ok) {
			return false;
		}
		await refreshAppShellData();
		await this.refreshSlice();
		return true;
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

export function setAcademicPageState(state: AcademicPageState) {
	setContext(ACADEMIC_PAGE_STATE_KEY, state);
}

export function getAcademicPageState() {
	return getContext<AcademicPageState>(ACADEMIC_PAGE_STATE_KEY);
}
