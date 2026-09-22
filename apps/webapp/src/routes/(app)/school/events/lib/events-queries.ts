import type { Incident, Student } from '$lib/types/school';
import type { EventsPageState } from '../events-page.svelte';
import type { PageQueryRequest } from './events-page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { safeOptionalFetch } from '$lib/api/safe-entity-access';
import { loadIncidentById, loadIncidentRouteData } from '$lib/api/school-life-data';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolveEventsPageLoad } from './events-page-status';

function emptyEventsSlice(): { incidents: Incident[]; students: Student[] } {
	return { incidents: [], students: [] };
}

export async function loadEventsSlice() {
	const schoolId = academicContext.schoolScopeId || academicContext.schools[0]?.id || '';
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
	return (url: URL, request?: PageQueryRequest) => resolveEventsPageLoad(url, {
		empty: () => ({}),
		load: async (signal) => {
			const data = await loadEventsSlice();
			signal.throwIfAborted();
			state.seed(data);
			return {};
		},
		hasItems: listPageHasItems,
		errorMessage: 'Unable to load events.',
	}, request);
}

export async function ensureIncidentDrawerSelection(
	state: EventsPageState,
	incidentId: string,
): Promise<boolean> {
	if (state.findIncident(incidentId)) {
		return true;
	}
	const client = queryClient();
	const incident = await loadIncidentById(client, incidentId);
	if (!incident) {
		return false;
	}
	state.appendIncident(incident);
	return true;
}
