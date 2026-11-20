export const STUDENT_SUBJECT_QUERY_KEY = 'subject';

export function readExpandedStudentSubject(
	url: URL,
	allowedSubjects: readonly string[],
): string | null {
	const subject = url.searchParams.get(STUDENT_SUBJECT_QUERY_KEY);
	return subject && allowedSubjects.includes(subject) ? subject : null;
}

export function writeExpandedStudentSubject(url: URL, subject: string | null): string {
	const next = new URL(url);
	if (subject) {
		next.searchParams.set(STUDENT_SUBJECT_QUERY_KEY, subject);
	}
	else {
		next.searchParams.delete(STUDENT_SUBJECT_QUERY_KEY);
	}
	return `${next.pathname}${next.search}`;
}
