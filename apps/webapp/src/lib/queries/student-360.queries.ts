import { loadStudent360Data } from '$lib/api/student-360-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';

export { studentDetailIdFromUrl } from '$lib/api/student-detail-url';

export async function getStudent360Data(studentId: string) {
	return loadStudent360Data(queryClient(), studentId);
}

/** Health profile and pedagogical notes for the student detail drawer. */
export async function seedStudent360ForStudent(studentId: string): Promise<void> {
	const { healthRecord, pedagogicalNotes } = await getStudent360Data(studentId);
	detailDataContext.seedStudent360Data(studentId, healthRecord, pedagogicalNotes);
}

export async function hydrateStudentDetailDrawer(studentId: string): Promise<void> {
	await seedStudent360ForStudent(studentId);
}
