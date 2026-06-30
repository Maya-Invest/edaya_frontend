import { loadStudent360Data } from '$lib/api/student-360-data';
import { queryClient } from '$lib/queries/client';

export async function getStudent360Data(studentId: string) {
	return loadStudent360Data(queryClient(), studentId);
}

export function studentDetailIdFromUrl(url: URL): string | undefined {
	return url.pathname.match(/\/(?:school\/students|classes\/[^/]+\/students)\/([^/]+)$/)?.[1];
}
