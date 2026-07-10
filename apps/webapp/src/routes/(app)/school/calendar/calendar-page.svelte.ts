import { detailDataContext } from '$lib/detail-data/context.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readCalendarListFilters, writeCalendarListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { getContext, setContext } from 'svelte';
import { querySchoolCalendarPage } from './lib/calendar-queries';

const CALENDAR_PAGE_STATE_KEY = Symbol('calendar-page-state');

export class CalendarPageState {
	readonly filters: ListFiltersState<{ q: string; type: string }>;

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeCalendarListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readCalendarListFilters(getUrl()),
		);
	}

	get events() {
		return detailDataContext.schoolYearEvents;
	}

	queryListPage() {
		return querySchoolCalendarPage();
	}
}

export function setCalendarPageState(state: CalendarPageState) {
	setContext(CALENDAR_PAGE_STATE_KEY, state);
}

export function getCalendarPageState(): CalendarPageState {
	return getContext<CalendarPageState>(CALENDAR_PAGE_STATE_KEY);
}
