import type { TeachingLogSources } from './teaching-log-data';
import { staffMember, subject } from '$lib/test/openapi-fixtures';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { mapTeachingLogEntries } from './teaching-log-data';

const classSources: TeachingLogSources = {
	classLogbookEntriesRaw: [
		{
			id: 'tle-cs-6a-math-0',
			schoolId: SEED_SCHOOL_ID,
			classGroupId: '6a',
			classSubjectId: 'cs-6a-math',
			date: '2026-05-22',
			chapter: 'Ch. 6 — Fractions',
			content: 'Addition et soustraction de fractions.',
			objectives: ['Mettre au même dénominateur'],
			homework: 'Manuel p.84 ex. 12 à 18',
			attachments: ['fiche-fractions.pdf'],
			progress: 62,
		},
	],
	classSubjectsRaw: [
		{ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math', completedPercentage: 0 },
	],
	subjectsRaw: [
		subject({ id: 'subj-math', name: 'Mathematics', code: 'MATH', defaultCoefficient: 3 }),
	],
	staffMembersRaw: [
		staffMember({ id: 'st1', firstName: 'Marie', lastName: 'Dupont', email: 'm.dupont@school.edu' }),
	],
	staffAssignmentsRaw: [
		{ id: 'sa-st1-math', staffId: 'st1', responsibility: 'Teacher', classSubjectId: 'cs-6a-math' },
	],
};

describe('mapTeachingLogEntries', () => {
	it('maps logbook entries with subject and teacher labels', () => {
		const entries = mapTeachingLogEntries({
			classLogbookEntriesRaw: [...classSources.classLogbookEntriesRaw],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
			staffMembersRaw: [...classSources.staffMembersRaw],
			staffAssignmentsRaw: [...classSources.staffAssignmentsRaw],
		});

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			id: 'tle-cs-6a-math-0',
			classId: '6a',
			subject: 'Mathematics',
			teacher: 'Marie Dupont',
			chapter: 'Ch. 6 — Fractions',
			homework: 'Manuel p.84 ex. 12 à 18',
			progress: 62,
		});
	});

	it('filters entries by subject name', () => {
		const entries = mapTeachingLogEntries({
			classLogbookEntriesRaw: [...classSources.classLogbookEntriesRaw],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
			staffMembersRaw: [...classSources.staffMembersRaw],
			staffAssignmentsRaw: [...classSources.staffAssignmentsRaw],
		}, 'Mathematics');

		expect(entries).toHaveLength(1);
		expect(entries[0]?.subject).toBe('Mathematics');
	});

	it('sorts entries by date descending', () => {
		const entries = mapTeachingLogEntries({
			classLogbookEntriesRaw: [
				{ ...classSources.classLogbookEntriesRaw[0], date: '2026-05-18', objectives: ['Mettre au même dénominateur'] },
				{
					...classSources.classLogbookEntriesRaw[0],
					id: 'tle-cs-6a-math-1',
					date: '2026-05-22',
					objectives: ['Mettre au même dénominateur'],
				},
			],
			classSubjectsRaw: [...classSources.classSubjectsRaw],
			subjectsRaw: [...classSources.subjectsRaw],
			staffMembersRaw: [],
			staffAssignmentsRaw: [],
		});

		expect(entries.map(entry => entry.date)).toEqual(['2026-05-22', '2026-05-18']);
	});
});
