import type { TeacherAssignmentsPageState } from '../teacher-assignments-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchTeacherAssignmentsHubData } from '$lib/api/teacher-assignments-hub-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
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
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			const scope = hubScopeFromContext();
			if (!scope.schoolId) {
				state.seed([], [], []);
				return {};
			}
			const data = await fetchTeacherAssignmentsHubData(getBrowserSchoolClient(), scope);
			state.seed(data.teachers, data.assignments, data.classSubjects);
			return {};
		},
		hasItems: listPageHasItems,
	});
}
