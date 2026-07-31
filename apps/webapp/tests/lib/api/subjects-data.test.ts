import { classSubject, staffMember, subject } from '$tests/support/openapi-fixtures';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { mapCatalogSubjects, mapClassSubjects } from '$lib/api/subjects-data';

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
	teachersRaw: [],
	teacherAssignmentsRaw: [],
};

describe('mapCatalogSubjects', () => {
	it('lists chapters only for the matching grade-level subject when subjectId is shared', () => {
		const sources = {
			gradeLevelSubjectsRaw: [
				{ id: 'gls-6-en', gradeLevelId: 'gl-6', subjectId: 'subj-en', academicYearId: 'ay-1', isOptional: false },
				{ id: 'gls-3-en', gradeLevelId: 'gl-3', subjectId: 'subj-en', academicYearId: 'ay-1', isOptional: false },
			],
			classSubjectsRaw: [],
			subjectsRaw: [
				subject({ id: 'subj-en', name: 'Anglais', code: 'ANG' }),
			],
			subjectMattersRaw: [
				{ id: 'sm-6-1', subjectId: 'subj-en', name: 'Unit 6ème A', sequenceOrder: 1 },
				{ id: 'sm-3-1', subjectId: 'subj-en', name: 'Unit 3ème A', sequenceOrder: 1 },
			],
			gradeLevelSubjectMattersRaw: [
				{ id: 'glsm-6', gradeLevelSubjectId: 'gls-6-en', subjectMatterId: 'sm-6-1' },
				{ id: 'glsm-3', gradeLevelSubjectId: 'gls-3-en', subjectMatterId: 'sm-3-1' },
			],
		};

		const entries = mapCatalogSubjects(sources, {});

		const sixieme = entries.find(entry => entry.id === 'gls-6-en');
		const troisieme = entries.find(entry => entry.id === 'gls-3-en');

		expect(sixieme?.catalogChapters).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'Unit 6ème A' })]),
		);
		expect(troisieme?.catalogChapters).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'Unit 3ème A' })]),
		);
	});

	it('keeps late 3ème / lycée subjects and chapters when sources exceed the default list page', () => {
		const gradeLevelSubjectsRaw = Array.from({ length: 52 }, (_, index) => ({
			id: `gls-${index}`,
			gradeLevelId: index < 50 ? 'gl-3' : 'gl-1era',
			subjectId: index < 50 ? `subj-${index}` : 'subj-tech',
			academicYearId: 'ay-1',
			isOptional: false,
		}));
		gradeLevelSubjectsRaw[49] = {
			id: 'gls-49',
			gradeLevelId: 'gl-3',
			subjectId: 'subj-svt',
			academicYearId: 'ay-1',
			isOptional: false,
		};
		gradeLevelSubjectsRaw[50] = {
			id: 'gls-50',
			gradeLevelId: 'gl-3',
			subjectId: 'subj-tech',
			academicYearId: 'ay-1',
			isOptional: false,
		};
		gradeLevelSubjectsRaw[51] = {
			id: 'gls-51',
			gradeLevelId: 'gl-1era',
			subjectId: 'subj-fr',
			academicYearId: 'ay-1',
			isOptional: false,
		};

		const subjectsRaw = [
			...Array.from({ length: 49 }, (_, index) => subject({
				id: `subj-${index}`,
				name: `Subject ${index}`,
				code: `S${index}`,
			})),
			subject({ id: 'subj-svt', name: 'Sciences de la Vie et de la Terre', code: 'SVT' }),
			subject({ id: 'subj-tech', name: 'Technologie', code: 'TECH' }),
			subject({ id: 'subj-fr', name: 'Français', code: 'FR' }),
		];

		const sources = {
			gradeLevelSubjectsRaw,
			classSubjectsRaw: [],
			subjectsRaw,
			subjectMattersRaw: [
				{ id: 'sm-svt', subjectId: 'subj-svt', name: 'Génétique', sequenceOrder: 1 },
				{ id: 'sm-tech', subjectId: 'subj-tech', name: 'Automatismes', sequenceOrder: 1 },
				{ id: 'sm-fr', subjectId: 'subj-fr', name: 'Dissertation', sequenceOrder: 1 },
			],
			gradeLevelSubjectMattersRaw: [
				{ id: 'glsm-svt', gradeLevelSubjectId: 'gls-49', subjectMatterId: 'sm-svt' },
				{ id: 'glsm-tech', gradeLevelSubjectId: 'gls-50', subjectMatterId: 'sm-tech' },
				{ id: 'glsm-fr', gradeLevelSubjectId: 'gls-51', subjectMatterId: 'sm-fr' },
			],
		};

		const entries = mapCatalogSubjects(sources, {});
		expect(entries.length).toBeGreaterThan(50);

		const tech = entries.find(entry => entry.id === 'gls-50');
		const lyceeFr = entries.find(entry => entry.id === 'gls-51');

		expect(tech?.name).toBe('Technologie');
		expect(tech?.catalogChapters).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'Automatismes' })]),
		);
		expect(lyceeFr?.name).toBe('Français');
		expect(lyceeFr?.catalogChapters).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'Dissertation' })]),
		);
	});
});

describe('mapClassSubjects', () => {
	it('maps category and color from API subject fields', () => {
		const subjects = mapClassSubjects('6a', {
			classSubjectsRaw: [...sources.classSubjectsRaw],
			subjectsRaw: [...sources.subjectsRaw],
			subjectMattersRaw: [...sources.subjectMattersRaw],
			staffMembersRaw: [...sources.staffMembersRaw],
			staffAssignmentsRaw: [...sources.staffAssignmentsRaw],
			teachersRaw: [],
			teacherAssignmentsRaw: [],
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
			teachersRaw: [],
			teacherAssignmentsRaw: [],
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
			teachersRaw: [],
			teacherAssignmentsRaw: [],
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
			teachersRaw: [],
			teacherAssignmentsRaw: [],
		});

		expect(subjects[0]?.teacher).toBe('Non assigné');
	});
});
