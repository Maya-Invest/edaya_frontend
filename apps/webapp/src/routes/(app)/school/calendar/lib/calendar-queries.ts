import type { PageQueryRequest } from '$lib/queries/page-status';
import type { CalendarPageState } from '../calendar-page.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

export function querySchoolCalendarPage(state: CalendarPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async (signal) => {
			await state.refreshSlice(signal);
			return {};
		},
		hasItems: listPageHasItems,
	}, request);
}
