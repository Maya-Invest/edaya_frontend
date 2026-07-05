import { loadStudent360Data } from '$lib/api/student-360-data';
import {
	loadStudentAttendanceHistory,
	loadStudentEnrollmentHistory,
	loadStudentGradeRows,
} from '$lib/api/student-drawer-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';

export { studentDetailIdFromUrl } from '$lib/api/student-detail-url';

export async function getStudent360Data(studentId: string) {
	return loadStudent360Data(queryClient(), studentId);
}

/** Health profile, drawer tabs, and pedagogical notes for the student detail drawer. */
export async function seedStudent360ForStudent(studentId: string): Promise<void> {
	const client = queryClient();
	const [{ healthRecord, pedagogicalNotes }, enrollments, grades, attendance] = await Promise.all([
		loadStudent360Data(client, studentId),
		loadStudentEnrollmentHistory(client, studentId),
		loadStudentGradeRows(client, studentId),
		loadStudentAttendanceHistory(client, studentId),
	]);
	detailDataContext.seedStudent360Data(studentId, healthRecord, pedagogicalNotes);
	detailDataContext.seedStudentDrawerData(studentId, { enrollments, grades, attendance });
}

export async function hydrateStudentDetailDrawer(studentId: string): Promise<void> {
	await seedStudent360ForStudent(studentId);
}
