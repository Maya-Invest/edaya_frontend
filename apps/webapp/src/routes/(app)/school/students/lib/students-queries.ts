import type { StudentsPageState } from '../students-page.svelte';
import type { PageQueryRequest } from './student-page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { listPageHasItems, resolveStudentPageLoad } from './student-page-status';

export function querySchoolStudentsPage(state: StudentsPageState) {
	return (url: URL, request?: PageQueryRequest) => resolveStudentPageLoad(url, {
		empty: () => ({ totalStudents: 0 }),
		load: async (signal) => {
			signal.throwIfAborted();
			state.hydrateFiltersFromUrl();
			await state.loadFirstPage(signal);
			signal.throwIfAborted();
			return { totalStudents: state.totalStudents };
		},
		hasItems: listPageHasItems,
	}, request);
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
