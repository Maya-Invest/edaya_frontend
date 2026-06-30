import { academicContext } from '$lib/academic/context.svelte';
import { schoolWideEntityList } from '$lib/api/entity-list-filters';
import { loadClassPeopleData } from '$lib/api/people-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad, listPageHasItems } from '$lib/queries/page-status';
import { getStudent360Data, studentDetailIdFromUrl } from '$lib/queries/student-360.queries';

const SCHOOL_ROSTER_SCOPE
	= 'School students administration route loads paginated school roster.';
const SCHOOL_GUARDIANS_SCOPE
	= 'School guardians administration lists guardians with paginated fetch.';

async function seedStudent360ForUrl(url: URL) {
	const studentId = studentDetailIdFromUrl(url);
	if (!studentId) {
		return;
	}

	const { healthRecord, pedagogicalNotes } = await getStudent360Data(studentId);
	detailDataContext.seedStudent360Data(studentId, healthRecord, pedagogicalNotes);
}

export function querySchoolStudentsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ totalStudents: 0 }),
		load: async () => {
			const { count } = await queryClient().entities.students.count(
				schoolWideEntityList(SCHOOL_ROSTER_SCOPE),
			);
			await seedStudent360ForUrl(url);
			return { totalStudents: count };
		},
		hasItems: listPageHasItems,
	});
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

export function querySchoolStaffPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({ totalStaff: 0 }),
		load: async () => {
			const schoolId = academicContext.schools[0]?.id ?? '';
			const { count } = schoolId
				? await queryClient().entities.staffMembers.count({ schoolId })
				: { count: 0 };
			return { totalStaff: count };
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
