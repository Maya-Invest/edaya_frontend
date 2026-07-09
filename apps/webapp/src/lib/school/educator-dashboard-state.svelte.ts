import { academicContext } from '$lib/academic/context.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readEducatorDashboardListFilters, writeEducatorDashboardListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';

export type EducatorDashboardTab = 'schoollife' | 'grades';

export const EDUCATOR_DASHBOARD_TAB_ITEMS = [
	{ k: 'schoollife' as const, labelKey: 'educator.schoolLife' },
	{ k: 'grades' as const, labelKey: 'educator.gradesReadOnly' },
] as const;

export class EducatorDashboardState {
	readonly filters: ListFiltersState<{ q: string; tab: string }>;

	constructor(getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeEducatorDashboardListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readEducatorDashboardListFilters(getUrl()),
		);
	}

	get tab(): EducatorDashboardTab {
		return this.filters.values.tab === 'grades' ? 'grades' : 'schoollife';
	}

	get students() {
		return detailDataContext.students;
	}

	get absences() {
		return detailDataContext.absences;
	}

	get incidents() {
		return detailDataContext.incidents;
	}

	get evaluations() {
		return detailDataContext.evaluations;
	}

	get classes() {
		return academicContext.classes;
	}

	get studentsBySearch() {
		const term = this.filters.values.q.trim().toLowerCase();
		if (!term) {
			return this.students;
		}
		return this.students.filter(student => student.name.toLowerCase().includes(term));
	}

	get recentAbsences() {
		return [...this.absences].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
	}

	get recentIncidents() {
		return [...this.incidents].sort((a, b) => (a.date < b.date ? 1 : -1));
	}

	get lateness() {
		return this.incidents.filter(incident => incident.category === 'Tardiness');
	}

	get discipline() {
		return this.incidents.filter(
			incident => incident.category === 'Behavior' || incident.category === 'Conflict',
		);
	}

	schoolAverage(): string {
		if (this.students.length === 0) {
			return '0';
		}
		const avg = this.students.reduce((acc, student) => acc + student.average, 0) / this.students.length;
		return avg.toFixed(1);
	}

	hydrateFromUrl(url: URL) {
		const next = readEducatorDashboardListFilters(url);
		this.filters.hydrate({
			q: next.q,
			tab: next.tab === 'grades' ? 'grades' : 'schoollife',
		});
	}

	applyTab(next: EducatorDashboardTab) {
		this.filters.values.tab = next;
		this.filters.scheduleSync();
	}
}
