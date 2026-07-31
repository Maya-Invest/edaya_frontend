import type { ClassStudentsPageState } from '../class-students-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadClassPeopleData } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { emptyClassStudentsSlice } from './class-students-helpers';

export async function loadClassStudentsSlice(classId: string) {
	const client = getBrowserSchoolClient();
	const classList = academicContext.classes;
	const currentClass = classList.find(entry => entry.id === classId) ?? classList[0];
	const { students } = await loadClassPeopleData(client, classId, academicContext.periodId);
	return {
		...emptyClassStudentsSlice(classId),
		students,
		currentClass,
	};
}

export function queryClassStudentsListPage(classId: string, state: ClassStudentsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => emptyClassStudentsSlice(classId),
		load: async () => {
			const data = await loadClassStudentsSlice(classId);
			state.applySlice(classId, data);
			return data;
		},
		hasItems: listPageHasItems,
	});
}

export async function ensureClassStudentDrawerSelection(
	state: ClassStudentsPageState,
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
