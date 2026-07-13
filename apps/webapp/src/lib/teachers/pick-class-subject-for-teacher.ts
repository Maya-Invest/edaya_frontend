export function pickClassSubjectIdForTeacherSubject(
	classSubjects: readonly { id: string; subjectId: string }[],
	teacherSubjectId?: string | null,
): string {
	if (!teacherSubjectId) {
		return '';
	}
	return classSubjects.find(entry => entry.subjectId === teacherSubjectId)?.id ?? '';
}
