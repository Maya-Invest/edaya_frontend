import type { TeachersPageState } from '../teachers-page.svelte';
import type { PageQueryRequest } from './teacher-page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { listPageHasItems, resolveTeacherPageLoad } from './teacher-page-status';

export function querySchoolTeachersPage(state: TeachersPageState) {
	return (url: URL, request?: PageQueryRequest) => resolveTeacherPageLoad(url, {
		empty: () => ({ totalTeachers: 0 }),
		load: async (signal) => {
			signal.throwIfAborted();
			state.hydrateFiltersFromUrl();
			await state.loadFirstPage();
			signal.throwIfAborted();
			return { totalTeachers: state.totalTeachers };
		},
		hasItems: listPageHasItems,
	}, request);
}

export async function ensureTeacherDrawerSelection(
	state: TeachersPageState,
	teacherId: string,
): Promise<boolean> {
	try {
		return await state.ensureSelectedTeacher(teacherId);
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return true;
		}
		throw error;
	}
}
