import type { EventsPageState } from '../events-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadIncidentRouteData } from '$lib/api/school-life-data';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolveEventsPageLoad } from './events-page-status';

export async function loadEventsSlice() {
	const client = queryClient();
	return loadIncidentRouteData(client, {
		schoolId: academicContext.schools[0]?.id ?? '',
		academicYearId: academicContext.yearId,
	});
}

export function querySchoolEventsPage(state: EventsPageState) {
	return (url: URL) => resolveEventsPageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const data = await loadEventsSlice();
			state.seed(data);
			return {};
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load events.',
	});
}

export async function ensureIncidentDrawerSelection(
	state: EventsPageState,
	incidentId: string,
): Promise<boolean> {
	return state.findIncident(incidentId) !== undefined;
}
