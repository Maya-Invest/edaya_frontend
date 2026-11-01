import type { PageQueryRequest } from '$lib/queries/page-status';
import type { TeacherAssignmentsPageState } from '../teacher-assignments-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchTeacherAssignmentsHubData } from '$lib/api/teacher-assignments-hub-data';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

function hubScopeFromContext() {
	return {
		schoolId: authSession.schoolId ?? academicContext.schools[0]?.id ?? '',
		academicYearId: academicContext.yearId
			|| academicContext.year?.id
			|| academicContext.years[0]?.id
			|| '',
	};
}

export function querySchoolTeacherAssignmentsPage(state: TeacherAssignmentsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async (signal) => {
			const scope = hubScopeFromContext();
			if (!scope.schoolId) {
				signal.throwIfAborted();
				state.seed([], [], []);
				return {};
			}
			const data = await fetchTeacherAssignmentsHubData(getBrowserSchoolClient(), scope);
			signal.throwIfAborted();
			state.seed(data.teachers, data.assignments, data.classSubjects);
			return {};
		},
		hasItems: listPageHasItems,
	}, request);
}
