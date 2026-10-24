import type { components } from '$lib/api/schema';
import type { SubjectSelection } from './subject-selection';
import { selectionFor, selectionKey } from './subject-selection';

type Placement = components['schemas']['StudentClassEnrollment'];
type Enrollment = components['schemas']['StudentSubjectEnrollment'];
export function bulkParticipationCandidates(placements: Placement[], now = new Date().toISOString()) {
	return placements.filter(row => !row.endedAt || row.endedAt > now);
}
export function commonSelection(placements: string[], enrollments: Enrollment[]): SubjectSelection | null {
	const selections = placements.map(id => selectionFor(enrollments.find(row => row.studentClassEnrollmentId === id && !row.deletedAt)));
	return selections.length && selections.every(row => selectionKey(row) === selectionKey(selections[0]!)) ? selections[0]! : null;
}
export function bulkParticipationOperations(input: { placements: Placement[]; selected: string[]; classSubjectId: string; selection: SubjectSelection }): components['schemas']['ManageStudentSubjectEnrollmentsCommand']['operations'] {
	return bulkParticipationCandidates(input.placements).filter(row => input.selected.includes(row.id)).map(row => ({ studentClassEnrollmentId: row.id, classSubjectId: input.classSubjectId, selection: input.selection }));
}
