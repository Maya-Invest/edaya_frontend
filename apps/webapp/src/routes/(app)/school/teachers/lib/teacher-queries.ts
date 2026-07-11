import type { TeachersPageState } from '../teachers-page.svelte';
import { ApiError } from '@edaya/api-client';
import { listPageHasItems, resolveTeacherPageLoad } from './teacher-page-status';

export function querySchoolTeachersPage(state: TeachersPageState) {
	return (url: URL) => resolveTeacherPageLoad(url, {
		empty: () => ({ totalTeachers: 0 }),
		load: async () => {
			state.hydrateFiltersFromUrl();
			await state.loadFirstPage();
			return { totalTeachers: state.totalTeachers };
		},
		hasItems: listPageHasItems,
	});
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
