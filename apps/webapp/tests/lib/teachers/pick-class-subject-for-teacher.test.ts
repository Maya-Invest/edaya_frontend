import { describe, expect, it } from 'bun:test';
import { pickClassSubjectIdForTeacherSubject } from '$lib/teachers/pick-class-subject-for-teacher';

describe('pickClassSubjectIdForTeacherSubject', () => {
	it('returns the class subject linked to the teacher catalog subject', () => {
		expect(pickClassSubjectIdForTeacherSubject([
			{ id: 'cs-maths-6a', subjectId: 'subj-maths' },
			{ id: 'cs-anglais-6a', subjectId: 'subj-anglais' },
		], 'subj-maths')).toBe('cs-maths-6a');
	});

	it('returns empty when the class has no matching subject', () => {
		expect(pickClassSubjectIdForTeacherSubject([
			{ id: 'cs-anglais-6a', subjectId: 'subj-anglais' },
		], 'subj-maths')).toBe('');
	});
});
