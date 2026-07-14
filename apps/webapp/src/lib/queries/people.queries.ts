import { academicContext } from '$lib/academic/context.svelte';
import { schoolWideEntityList } from '$lib/api/entity-list-filters';
import { loadClassPeopleData } from '$lib/api/people-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad, listPageHasItems } from '$lib/queries/page-status';
import { seedStudent360ForStudent, studentDetailIdFromUrl } from '$lib/queries/student-360.queries';
import { ApiError } from '@maya-invest/edaya-api-client';

const SCHOOL_GUARDIANS_SCOPE
	= 'School guardians administration lists guardians with paginated fetch.';

async function seedStudent360ForUrl(url: URL) {
	const studentId = studentDetailIdFromUrl(url);
	if (!studentId) {
		return;
	}

	try {
		await seedStudent360ForStudent(studentId);
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return;
		}
		throw error;
	}
}

export function querySchoolGuardiansPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ totalGuardians: 0 }),
		load: async () => {
			const { count } = await queryClient().entities.guardians.count(
				schoolWideEntityList(SCHOOL_GUARDIANS_SCOPE),
			);
			return { totalGuardians: count };
		},
		hasItems: listPageHasItems,
	});
}

export function querySchoolTeachersPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ totalTeachers: 0 }),
		load: async () => {
			return { totalTeachers: 0 };
		},
		hasItems: listPageHasItems,
	});
}

export function querySchoolStaffPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ totalStaff: 0 }),
		load: async () => {
			return { totalStaff: 0 };
		},
		hasItems: listPageHasItems,
	});
}

export function queryClassStudentsPage(classId: string) {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({
			classId,
			currentClass: academicContext.classes.find(entry => entry.id === classId) ?? academicContext.classes[0],
		}),
		load: async () => {
			const classList = academicContext.classes;
			const currentClass = classList.find(entry => entry.id === classId) ?? classList[0];
			const { students } = await loadClassPeopleData(
				queryClient(),
				classId,
				academicContext.periodId,
			);
			detailDataContext.seedStudents(students, { classId });
			await seedStudent360ForUrl(url);
			return { classId, currentClass };
		},
		hasItems: listPageHasItems,
	});
}
