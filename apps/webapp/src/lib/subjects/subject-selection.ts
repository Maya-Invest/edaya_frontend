import type { components } from '$lib/api/schema';

export type SubjectSelection = components['schemas']['ManageStudentSubjectEnrollmentsCommand']['operations'][number]['selection'];
export type Enrollment = components['schemas']['StudentSubjectEnrollment'];
export type EnrollmentPeriod = components['schemas']['StudentSubjectEnrollmentsResponse']['periods'][number];

export function selectionFor(row?: Enrollment): SubjectSelection {
	if (!row || row.deletedAt)
		return { scope: 'none' };
	return row.scope === 'periods' ? { scope: 'periods', periodIds: row.periods.map(period => period.periodId) } : { scope: 'annual' };
}
export function selectionKey(selection: SubjectSelection): string {
	return JSON.stringify(selection.scope === 'periods' ? { scope: 'periods', periodIds: [...selection.periodIds].sort() } : selection);
}
export function selectionChanged(selection: SubjectSelection, row?: Enrollment): boolean {
	return selectionKey(selection) !== selectionKey(selectionFor(row));
}
