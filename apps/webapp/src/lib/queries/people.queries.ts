import { academicContext } from '$lib/academic/context.svelte';
import { schoolWideEntityList } from '$lib/api/entity-list-filters';
import { loadClassPeopleData } from '$lib/api/people-data';
import { loadPermissionCatalog } from '$lib/api/staff-permission-assignments-data';
import { fetchSchoolSubjectsSources, mapAllClassSubjects } from '$lib/api/subjects-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { resolvePageLoad, listPageHasItems } from '$lib/queries/page-status';
import { seedStudent360ForStudent, studentDetailIdFromUrl } from '$lib/queries/student-360.queries';

const SCHOOL_ROSTER_SCOPE
	= 'School students administration route loads paginated school roster.';
const SCHOOL_GUARDIANS_SCOPE
	= 'School guardians administration lists guardians with paginated fetch.';

async function seedStudent360ForUrl(url: URL) {
	const studentId = studentDetailIdFromUrl(url);
	if (!studentId) {
		return;
	}

	await seedStudent360ForStudent(studentId);
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
			const client = queryClient();
			const [countResult, subjectSources, catalog] = await Promise.all([
				schoolId ? client.entities.staffMembers.count({ schoolId }) : Promise.resolve({ count: 0 }),
				fetchSchoolSubjectsSources(client),
				loadPermissionCatalog(client),
			]);
			const allSubjects = mapAllClassSubjects(subjectSources);
			for (const classNode of academicContext.classes) {
				detailDataContext.seedSubjects(
					allSubjects.filter(subject => subject.classId === classNode.id),
					{ classId: classNode.id },
				);
			}
			detailDataContext.seedStaffPermissionData({
				assignments: detailDataContext.staffPermissionAssignments,
				catalog,
			});
			return { totalStaff: countResult.count };
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
