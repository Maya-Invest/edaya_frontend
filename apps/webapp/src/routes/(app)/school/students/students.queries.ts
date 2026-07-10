import { ApiError } from '$api-client';
import { resolvePageLoad, listPageHasItems } from '$lib/queries/page-status';
import type { StudentsPageState } from './students-page.svelte';

export function querySchoolStudentsPage(state: StudentsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ totalStudents: 0 }),
		load: async () => {
			state.hydrateFiltersFromUrl();
			if (state.usesFullRoster) {
				await state.loadFullRoster();
			}
			else {
				await state.loadFirstPage();
			}
			return { totalStudents: state.totalStudents };
		},
		hasItems: listPageHasItems,
		waitForShell: false,
	});
}

export async function ensureStudentDrawerSelection(
	state: StudentsPageState,
	studentId: string,
): Promise<boolean> {
	try {
		return await state.ensureSelectedStudent(studentId);
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return true;
		}
		throw error;
	}
}
