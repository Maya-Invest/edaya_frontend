import type { Incident, Student } from '$lib/types/school';
import type { EventsPageState } from '../events-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { safeOptionalFetch } from '$lib/api/safe-entity-access';
import { loadIncidentRouteData } from '$lib/api/school-life-data';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolveEventsPageLoad } from './events-page-status';

function emptyEventsSlice(): { incidents: Incident[]; students: Student[] } {
	return { incidents: [], students: [] };
}

export async function loadEventsSlice() {
	const schoolId = academicContext.schools[0]?.id ?? '';
	if (!schoolId) {
		return emptyEventsSlice();
	}
	const client = queryClient();
	return safeOptionalFetch(
		() => loadIncidentRouteData(client, {
			schoolId,
			academicYearId: academicContext.yearId,
		}),
		emptyEventsSlice(),
	);
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
