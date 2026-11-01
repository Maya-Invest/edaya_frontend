import type { TeachingLogSources } from '$lib/api/teaching-log-data';
import { mapTeachingLogEntries } from '$lib/api/teaching-log-data';
import { classSubject, lessonSession, staffMember, subject } from '$tests/support/openapi-fixtures';
import { describe, expect, it } from 'bun:test';

const classSources: TeachingLogSources = {
	lessonSessionsRaw: [
		lessonSession({
			id: 'ls-cs-6a-math-0',
			classGroupId: '6a',
			scheduleId: 'sched-1',
			classSubjectId: 'cs-6a-math',
			displayLabel: 'Ch. 6 — Fractions',
			sessionNote: 'Addition et soustraction de fractions.',
		}),
	],
	classSubjectProgressRaw: [
		{
			id: 'csp-1',
			classSubjectMatterId: 'csm-1',
			lessonSessionId: 'ls-cs-6a-math-0',
			completedPercentage: 62,
			notes: 'Mettre au même dénominateur',
		},
	],
	classSubjectMattersRaw: [
		{
			id: 'csm-1',
			classSubjectId: 'cs-6a-math',
			subjectMatterId: 'sm-1',
			status: 'in_progress',
			completedPercentage: 0,
		},
	],
	classSubjectsRaw: [
		classSubject({ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math' }),
	],
	subjectsRaw: [
		subject({ id: 'subj-math', name: 'Mathematics', code: 'MATH', coefficient: 3 }),
	],
	staffMembersRaw: [
		staffMember({ id: 'st1', firstName: 'Marie', lastName: 'Dupont', email: 'm.dupont@school.edu' }),
	],
	staffAssignmentsRaw: [
		{ id: 'sa-st1-math', staffId: 'st1', academicYearId: '2025', responsibility: 'Teacher', classSubjectId: 'cs-6a-math', permissions: [] },
	],
	teachersRaw: [{ id: 'teacher', firstName: 'Aminata', lastName: 'Touré', isActive: true }],
	teacherAssignmentsRaw: [{ id: 'teaching', teacherId: 'teacher', academicYearId: '2025', kind: 'subject', classSubjectId: 'cs-6a-math', status: 'active' }],
};

describe('mapTeachingLogEntries', () => {
	it('maps lesson sessions with subject and teacher labels', () => {
		const entries = mapTeachingLogEntries({
			lessonSessionsRaw: [...classSources.lessonSessionsRaw],
			classSubjectProgressRaw: [...classSources.classSubjectProgressRaw],
			classSubjectMattersRaw: [...classSources.classSubjectMattersRaw],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
			staffMembersRaw: [...classSources.staffMembersRaw],
			staffAssignmentsRaw: [...classSources.staffAssignmentsRaw],
			teachersRaw: classSources.teachersRaw,
			teacherAssignmentsRaw: classSources.teacherAssignmentsRaw,
		});

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			id: 'ls-cs-6a-math-0',
			classId: '6a',
			subject: 'Mathematics',
			teacher: 'Aminata Touré',
			content: 'Addition et soustraction de fractions.',
			progress: 62,
		});
	});

	it('filters entries by subject name', () => {
		const entries = mapTeachingLogEntries({
			lessonSessionsRaw: [...classSources.lessonSessionsRaw],
			classSubjectProgressRaw: [...classSources.classSubjectProgressRaw],
			classSubjectMattersRaw: [...classSources.classSubjectMattersRaw],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
			staffMembersRaw: [...classSources.staffMembersRaw],
			staffAssignmentsRaw: [...classSources.staffAssignmentsRaw],
			teachersRaw: classSources.teachersRaw,
			teacherAssignmentsRaw: classSources.teacherAssignmentsRaw,
		}, 'Mathematics');

		expect(entries).toHaveLength(1);
		expect(entries[0]?.subject).toBe('Mathematics');
	});

	it('sorts entries by date descending', () => {
		const entries = mapTeachingLogEntries({
			lessonSessionsRaw: [
				{ ...classSources.lessonSessionsRaw[0], id: 'ls-1', startsAt: '2026-05-18T08:00:00.000Z' },
				{ ...classSources.lessonSessionsRaw[0], id: 'ls-2', startsAt: '2026-05-22T08:00:00.000Z' },
			],
			classSubjectProgressRaw: [],
			classSubjectMattersRaw: [...classSources.classSubjectMattersRaw],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
			staffMembersRaw: [],
			staffAssignmentsRaw: [],
			teachersRaw: classSources.teachersRaw,
			teacherAssignmentsRaw: classSources.teacherAssignmentsRaw,
		});

		expect(entries.map(entry => entry.date)).toEqual(['2026-05-22', '2026-05-18']);
	});
});
