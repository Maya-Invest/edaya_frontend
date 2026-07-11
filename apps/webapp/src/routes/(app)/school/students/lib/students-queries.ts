import type { StudentsPageState } from '../students-page.svelte';
import { ApiError } from '@edaya/api-client';
import { listPageHasItems, resolveStudentPageLoad } from './student-page-status';

export function querySchoolStudentsPage(state: StudentsPageState) {
	return (url: URL) => resolveStudentPageLoad(url, {
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
