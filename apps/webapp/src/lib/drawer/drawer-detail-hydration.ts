import { ApiError } from '$api-client';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchActivityById } from '$lib/api/activities-data';
import { teacherAssignmentsForTeachers } from '$lib/api/entity-list-filters';
import { fetchGuardianById, fetchStudentById } from '$lib/api/people-data';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { fetchStaffMemberById } from '$lib/api/staff-data';
import { fetchTeacherById } from '$lib/api/teachers-data';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { hydrateStudentDetailDrawer } from '$lib/queries/student-360.queries';

async function ensureStudent(studentId: string, classId?: string) {
	if (detailDataContext.students.some(student => student.id === studentId)) {
		return;
	}

	const student = await fetchStudentById(queryClient(), studentId);
	if (student) {
		detailDataContext.seedStudents([student], classId ? { classId } : undefined);
	}
}

async function ensureTeacher(teacherId: string) {
	if (detailDataContext.teachers.some(teacher => teacher.id === teacherId)) {
		return;
	}

	const teacher = await fetchTeacherById(queryClient(), teacherId);
	if (!teacher) {
		return;
	}

	detailDataContext.seedTeachers([teacher]);
	const academicYearId = academicContext.yearId || academicContext.years[0]?.id || '';
	if (!academicYearId) {
		return;
	}

	const assignments = await safeOptionalEntityList(() =>
		queryClient().entities.teacherAssignments.list({
			...teacherAssignmentsForTeachers([teacherId]),
			academicYearId,
			status: 'active',
		}));
	detailDataContext.mergeTeacherAssignments(assignments);
}

async function ensureStaff(staffId: string) {
	if (detailDataContext.staff.some(member => member.id === staffId)) {
		return;
	}

	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	if (!schoolId) {
		return;
	}

	const member = await fetchStaffMemberById(queryClient(), staffId, schoolId);
	if (member) {
		detailDataContext.seedStaff([member]);
	}
}

async function ensureGuardian(guardianId: string) {
	if (detailDataContext.guardians.some(guardian => guardian.id === guardianId)) {
		return;
	}

	const guardian = await fetchGuardianById(queryClient(), guardianId);
	if (guardian) {
		detailDataContext.seedGuardians([guardian]);
	}
}

async function ensureActivity(activityId: string) {
	if (detailDataContext.activities.some(activity => activity.id === activityId)) {
		return;
	}

	const activity = await fetchActivityById(queryClient(), activityId);
	if (activity) {
		detailDataContext.seedActivities([activity]);
	}
}

/** Load drawer entities from the API when missing from in-memory stores (deep-link support). */
export async function hydrateDetailEntitiesForPath(pathname: string): Promise<void> {
	const schoolStudentMatch = pathname.match(/^\/school\/students\/([^/]+)$/);
	if (schoolStudentMatch) {
		const studentId = schoolStudentMatch[1];
		await ensureStudent(studentId);
		try {
			await hydrateStudentDetailDrawer(studentId);
		}
		catch (error) {
			if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) {
				throw error;
			}
		}
		return;
	}

	const classStudentMatch = pathname.match(/^\/classes\/([^/]+)\/students\/([^/]+)$/);
	if (classStudentMatch) {
		const [, classId, studentId] = classStudentMatch;
		await ensureStudent(studentId, classId);
		try {
			await hydrateStudentDetailDrawer(studentId);
		}
		catch (error) {
			if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) {
				throw error;
			}
		}
		return;
	}

	const teacherMatch = pathname.match(/^\/school\/teachers\/([^/]+)$/);
	if (teacherMatch) {
		await ensureTeacher(teacherMatch[1]);
		return;
	}

	const staffMatch = pathname.match(/^\/school\/staff\/([^/]+)$/);
	if (staffMatch) {
		const id = staffMatch[1];
		await ensureStaff(id);
		if (!detailDataContext.staff.some(member => member.id === id)) {
			await ensureGuardian(id);
		}
		return;
	}

	const guardianMatch = pathname.match(/^\/school\/guardians\/([^/]+)$/);
	if (guardianMatch) {
		await ensureGuardian(guardianMatch[1]);
		return;
	}

	const activityMatch = pathname.match(/^\/school\/activities\/([^/]+)$/);
	if (activityMatch) {
		await ensureActivity(activityMatch[1]);
	}
}
