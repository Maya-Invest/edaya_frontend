import { loadClassSubjects } from '$lib/api/subjects-data';
import { queryClient } from '$lib/queries/client';

export async function getClassSubjects(classId: string) {
	return loadClassSubjects(queryClient(), classId);
}
