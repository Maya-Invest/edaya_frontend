import { classSubject, staffMember, subject } from '$lib/test/openapi-fixtures';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { mapClassSubjects } from './subjects-data';

const sources = {
	classSubjectsRaw: [
		classSubject({ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math' }),
		classSubject({ id: 'cs-6a-fr', classGroupId: '6a', subjectId: 'subj-fr' }),
		classSubject({ id: 'cs-6a-hist', classGroupId: '6a', subjectId: 'subj-hist' }),
		classSubject({ id: 'cs-6a-en', classGroupId: '6a', subjectId: 'subj-en' }),
		classSubject({ id: 'cs-6a-eps', classGroupId: '6a', subjectId: 'subj-eps' }),
	],
	subjectsRaw: [
		subject({ id: 'subj-math', name: 'Mathematics', code: 'MATH', defaultCoefficient: 3 }),
		subject({ id: 'subj-fr', name: 'French Literature', code: 'FR', defaultCoefficient: 2, category: 'Littéraire', color: 'warm' }),
		subject({ id: 'subj-hist', name: 'History & Geography', code: 'HIST', defaultCoefficient: 2, category: 'Sciences humaines', color: 'sky' }),
		subject({ id: 'subj-en', name: 'English', code: 'EN', defaultCoefficient: 2, category: 'Langues', color: 'sky' }),
		subject({ id: 'subj-eps', name: 'Physical Education', code: 'EPS', defaultCoefficient: 1, category: 'Sport', color: 'mint' }),
	],
	subjectMattersRaw: [
		{ id: 'sm-math', subjectId: 'subj-math', name: 'Core programme', description: 'Algebra fundamentals.', sequenceOrder: 1, estimatedHours: 5 },
		{ id: 'sm-fr', subjectId: 'subj-fr', name: 'Core programme', description: 'Reading and writing.', sequenceOrder: 1, estimatedHours: 4 },
		{ id: 'sm-hist', subjectId: 'subj-hist', name: 'Core programme', description: 'Antiquity to medieval Europe.', sequenceOrder: 1, estimatedHours: 3 },
		{ id: 'sm-en', subjectId: 'subj-en', name: 'Core programme', description: 'Grammar and conversation.', sequenceOrder: 1, estimatedHours: 3 },
		{ id: 'sm-eps', subjectId: 'subj-eps', name: 'Core programme', description: 'Team sports and fitness.', sequenceOrder: 1, estimatedHours: 2 },
	],
	staffMembersRaw: [
		staffMember({ id: 'st1', firstName: 'Marie', lastName: 'Dupont', email: 'm.dupont@school.edu' }),
	],
	staffAssignmentsRaw: [
		{ id: 'sa-st1-math', staffId: 'st1', academicYearId: '2025', responsibility: 'Teacher', classSubjectId: 'cs-6a-math', permissions: [] },
	],
};

describe('mapClassSubjects', () => {
	it('maps category and color from API subject fields', () => {
		const subjects = mapClassSubjects('6a', {
			classSubjectsRaw: [...sources.classSubjectsRaw],
			subjectsRaw: [...sources.subjectsRaw],
			subjectMattersRaw: [...sources.subjectMattersRaw],
			staffMembersRaw: [...sources.staffMembersRaw],
			staffAssignmentsRaw: [...sources.staffAssignmentsRaw],
		});

		expect(subjects).toHaveLength(5);

		const byName = Object.fromEntries(subjects.map(subject => [subject.name, subject]));

		expect(byName.Mathematics).toMatchObject({ category: 'Scientifique', color: 'mint' });
		expect(byName['French Literature']).toMatchObject({ category: 'Littéraire', color: 'warm' });
		expect(byName['History & Geography']).toMatchObject({ category: 'Sciences humaines', color: 'sky' });
		expect(byName.English).toMatchObject({ category: 'Langues', color: 'sky' });
		expect(byName['Physical Education']).toMatchObject({ category: 'Sport', color: 'mint' });
	});

	it('uses the same color for a subject across class subject instances', () => {
		const subjects = mapClassSubjects('6a', {
			classSubjectsRaw: [
				classSubject({ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math' }),
				classSubject({ id: 'cs-6b-math', classGroupId: '6b', subjectId: 'subj-math' }),
			],
			subjectsRaw: [
				{ id: 'subj-math', schoolId: SEED_SCHOOL_ID, name: 'Mathematics', code: 'MATH', defaultCoefficient: 3, category: 'Scientifique', color: 'mint' },
			],
			subjectMattersRaw: [],
			staffMembersRaw: [],
			staffAssignmentsRaw: [],
		});

		const colors = new Set(subjects.map(subject => subject.color));
		expect(colors).toEqual(new Set(['mint']));
	});

	it('falls back to defaults when API fields are missing', () => {
		const subjects = mapClassSubjects('6a', {
			classSubjectsRaw: [
				classSubject({ id: 'cs-6a-sci', classGroupId: '6a', subjectId: 'subj-sci' }),
			],
			subjectsRaw: [
				subject({ id: 'subj-sci', name: 'Natural Sciences', code: 'SCI', defaultCoefficient: 2 }),
			],
			subjectMattersRaw: [],
			staffMembersRaw: [],
			staffAssignmentsRaw: [],
		});

		expect(subjects[0]).toMatchObject({ category: 'Scientifique', color: 'mint' });
	});

	it('shows a placeholder teacher when staff roster data is unavailable', () => {
		const subjects = mapClassSubjects('6a', {
			classSubjectsRaw: [
				classSubject({ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math' }),
			],
			subjectsRaw: [
				subject({ id: 'subj-math', name: 'Mathematics', code: 'MATH', defaultCoefficient: 3 }),
			],
			subjectMattersRaw: [],
			staffMembersRaw: [],
			staffAssignmentsRaw: [
				{ id: 'sa-st1-math', staffId: 'st1', academicYearId: '2025', responsibility: 'Teacher', classSubjectId: 'cs-6a-math', permissions: [] },
			],
		});

		expect(subjects[0]?.teacher).toBe('Non assigné');
	});
});
