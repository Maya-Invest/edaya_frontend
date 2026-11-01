import type { components } from '$lib/api/schema';
import type { Enrollment, EnrollmentPeriod, SubjectSelection } from './subject-selection';
import { selectionChanged, selectionFor, selectionKey } from './subject-selection';

export type ParticipationData = components['schemas']['StudentSubjectEnrollmentsResponse'];
export type EnrollmentOperation = components['schemas']['ManageStudentSubjectEnrollmentsCommand']['operations'][number];
export interface EnrollmentStudent { id: string; name: string; enrollmentId?: string }
export interface EnrollmentEditorContext {
	schoolId: string;
	academicYearId: string;
	classGroupId: string;
	className: string;
	yearName: string;
	zone: string;
	students: EnrollmentStudent[];
	/** Omitted when choosing subjects from a student list. */
	classSubjectId?: string;
	/** Teaching roster entry: choose recipients inside the same editor. */
	chooseStudents?: boolean;
}
export interface SubjectDraft { enabled: boolean; explicit: boolean; selection: SubjectSelection }
export const SUBJECT_ENROLLMENT_OPERATION_LIMIT = 500;

export function enrollmentSelectionClass(rows: readonly { id: string; classId: string; enrollmentId?: string }[], selectedIds: readonly string[]): string | null {
	if (!selectedIds.length)
		return null;
	const byId = new Map(rows.map(row => [row.id, row]));
	const selected = selectedIds.map(id => byId.get(id));
	const classId = selected[0]?.classId;
	return classId && selected.every(row => row?.classId === classId && row.enrollmentId) ? classId : null;
}

export function editorPlacement(data: ParticipationData, context: EnrollmentEditorContext, now: string) {
	const expected = context.students.find(row => row.id === data.studentId)?.enrollmentId;
	const candidates = data.placements.filter(row => row.academicYearId === context.academicYearId
		&& row.classGroupId === context.classGroupId && row.status === 'active'
		&& (!row.endedAt || row.endedAt > now) && (!expected || expected === row.id));
	return candidates.length === 1 ? candidates[0] : undefined;
}

export function editorEnrollment(data: ParticipationData, context: EnrollmentEditorContext, subjectId: string, now: string): Enrollment | undefined {
	const placement = editorPlacement(data, context, now);
	return data.enrollments.find(row => row.studentClassEnrollmentId === placement?.id && row.classSubjectId === subjectId && !row.deletedAt);
}

export function editorCommonSelection(data: ParticipationData[], context: EnrollmentEditorContext, studentIds: readonly string[], subjectId: string, now: string): SubjectSelection | null {
	const choices = studentIds.map((id) => {
		const student = data.find(row => row.studentId === id);
		return selectionFor(student ? editorEnrollment(student, context, subjectId, now) : undefined);
	});
	return choices.length && choices.every(choice => selectionKey(choice) === selectionKey(choices[0]!)) ? choices[0]! : null;
}

/** Completed periods can be retained, but never newly assigned to another student. */
export function preserveCompletedPeriods(selection: SubjectSelection, previous: Enrollment | undefined, periods: EnrollmentPeriod[], today: string): SubjectSelection {
	if (selection.scope !== 'periods')
		return selection;
	const completed = new Set(periods.filter(period => String(period.endDate).slice(0, 10) < today).map(period => period.id));
	const ids = [...selection.periodIds.filter(id => !completed.has(id)), ...(previous?.periods.filter(period => completed.has(period.periodId)).map(period => period.periodId) ?? [])];
	return ids.length ? { scope: 'periods', periodIds: [...new Set(ids)].sort() } : { scope: 'none' };
}

export function editorOperations(data: ParticipationData[], context: EnrollmentEditorContext, studentIds: readonly string[], drafts: Record<string, SubjectDraft>, now: string, today: string): EnrollmentOperation[] {
	const operations: EnrollmentOperation[] = [];
	for (const studentId of studentIds) {
		const student = data.find(row => row.studentId === studentId);
		const placement = student && editorPlacement(student, context, now);
		if (!student || !placement)
			throw new Error('participation.invalidPlacement');
		for (const [classSubjectId, draft] of Object.entries(drafts)) {
			if (!draft.enabled || !draft.explicit)
				continue;
			const previous = editorEnrollment(student, context, classSubjectId, now);
			const selection = preserveCompletedPeriods(draft.selection, previous, student.periods, today);
			if (selectionChanged(selection, previous))
				operations.push({ studentClassEnrollmentId: placement.id, classSubjectId, selection });
		}
	}
	return operations;
}
