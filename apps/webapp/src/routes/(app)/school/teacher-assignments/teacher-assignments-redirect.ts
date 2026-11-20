const TEACHER_ASSIGNMENTS_HUB_PATH = '/configuration/tools/teacher-assignments';
const SAFE_TEACHER_ASSIGNMENT_LIST_PARAMS = ['q', 'class', 'teacher'] as const;

export function teacherAssignmentsCompatibilityHref(url: URL): string {
	const next = new URL(TEACHER_ASSIGNMENTS_HUB_PATH, url.origin);
	for (const key of SAFE_TEACHER_ASSIGNMENT_LIST_PARAMS) {
		const value = url.searchParams.get(key)?.trim();
		if (value) {
			next.searchParams.set(key, value);
		}
	}
	return `${next.pathname}${next.search}`;
}
