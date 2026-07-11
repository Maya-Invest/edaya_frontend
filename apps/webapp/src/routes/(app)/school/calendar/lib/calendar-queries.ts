import { academicContext } from '$lib/academic/context.svelte';
import { loadAbsences, loadCalendarEvents } from '$lib/api/school-life-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';

export function querySchoolCalendarPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const client = queryClient();
			const classIds = academicContext.classes.map(entry => entry.id);
			const [events, absences] = await Promise.all([
				loadCalendarEvents(client, academicContext.yearId).catch((error) => {
					if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
						return [];
					}
					throw error;
				}),
				loadAbsences(client, classIds).catch((error) => {
					if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
						return [];
					}
					throw error;
				}),
			]);
			detailDataContext.seedSchoolYearEvents(events);
			detailDataContext.seedAbsences(absences);
			return {};
		},
		hasItems: listPageHasItems,
	});
}
