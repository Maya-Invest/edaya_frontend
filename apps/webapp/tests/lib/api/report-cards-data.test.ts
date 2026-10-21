import type { components } from '$lib/api/schema';
import {
	mapDefinitionStatus,
	mapGradeScales,
	mapReportCardDefinitions,
	mapReportCardResults,
	mapSectionRole,
	mapSubjectMark,
	resolveClassSubjectId,
	subjectLabelForCatalogId,
} from '$lib/api/report-cards-data';
import { setLang } from '$lib/i18n';
import { classSubject, reportCardDefinition, subject } from '$tests/support/openapi-fixtures';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';

const seedGradeScalesRaw = [
	{
		id: 'gs-20',
		schoolId: SEED_SCHOOL_ID,
		name: 'Sur 20',
		minScore: 0,
		maxScore: 20,
		isDefault: true,
		decimalPlaces: 2,
		description: 'Barème standard français — note sur 20, seuil de réussite à 10.',
		ranges: [
			{ letter: 'D', minScore: 0, maxScore: 9.99, interpretation: 'Insuffisant' },
			{ letter: 'C', minScore: 10, maxScore: 13.99, interpretation: 'Assez bien' },
			{ letter: 'B', minScore: 14, maxScore: 15.99, interpretation: 'Bien' },
			{ letter: 'A', minScore: 16, maxScore: 20, interpretation: 'Très bien' },
		],
	},
	{
		id: 'gs-100',
		schoolId: SEED_SCHOOL_ID,
		name: 'Sur 100',
		minScore: 0,
		maxScore: 100,
		isDefault: false,
		decimalPlaces: 1,
		description: 'Pourcentage ou centième — utilisé en sport ou projets transversaux.',
		ranges: [
			{ letter: 'D', minScore: 0, maxScore: 49.99, interpretation: 'Insuffisant' },
			{ letter: 'C', minScore: 50, maxScore: 59.99, interpretation: 'Passable' },
			{ letter: 'B', minScore: 60, maxScore: 79.99, interpretation: 'Satisfaisant' },
			{ letter: 'A', minScore: 80, maxScore: 100, interpretation: 'Excellent' },
		],
	},
	{
		id: 'gs-lettres',
		schoolId: SEED_SCHOOL_ID,
		name: 'Appréciations (A–D)',
		minScore: 0,
		maxScore: 4,
		isDefault: false,
		decimalPlaces: 0,
		description: 'A = Très bien · B = Bien · C = Assez bien · D = Insuffisant.',
		ranges: [
			{ letter: 'D', minScore: 0, maxScore: 1.99, interpretation: 'Insuffisant' },
			{ letter: 'C', minScore: 2, maxScore: 2.49, interpretation: 'Assez bien' },
			{ letter: 'B', minScore: 2.5, maxScore: 3.49, interpretation: 'Bien' },
			{ letter: 'A', minScore: 3.5, maxScore: 4, interpretation: 'Très bien' },
		],
	},
];

describe('report cards grade scale mapping', () => {
	it('maps grade scales from API fields without per-id tables', () => {
		const scales = mapGradeScales([...seedGradeScalesRaw]);

		expect(scales.find(scale => scale.id === 'gs-20')).toMatchObject({
			name: 'Sur 20',
			decimalPlaces: 2,
			isDefault: true,
			description: 'Barème standard français — note sur 20, seuil de réussite à 10.',
		});
		expect(scales.find(scale => scale.id === 'gs-100')).toMatchObject({
			decimalPlaces: 1,
		});
		expect(scales.find(scale => scale.id === 'gs-lettres')).toMatchObject({
			decimalPlaces: 0,
			description: 'A = Très bien · B = Bien · C = Assez bien · D = Insuffisant.',
		});
	});
});

const seedDefinitionsRaw = [
	reportCardDefinition({
		id: 'rcd-ms-6',
		name: 'Bulletin trimestriel — Collège (6ème)',
		isDefault: true,
	}),
	reportCardDefinition({
		id: 'rcd-ms-draft',
		name: 'Bulletin trimestriel — Collège (modèle brouillon)',
		status: 'draft',
	}),
];

const seedDefinitionSectionsRaw = [
	{
		id: 'rcs-ms-fond',
		reportCardDefinitionId: 'rcd-ms-6',
		name: 'Matières fondamentales',
		kind: 'group' as const,
		role: 'matieres' as const,
		coefficient: 2,
		order: 1,
		weight: 2,
	},
	{
		id: 'rcs-ms-sci',
		reportCardDefinitionId: 'rcd-ms-6',
		name: 'Sciences & langues',
		kind: 'group' as const,
		role: 'matieres' as const,
		coefficient: 1.5,
		order: 2,
		weight: 2,
	},
	{
		id: 'rcs-ms-sport',
		reportCardDefinitionId: 'rcd-ms-6',
		name: 'EPS & arts',
		kind: 'group' as const,
		role: 'matieres' as const,
		coefficient: 1,
		order: 3,
		weight: 1,
	},
	{
		id: 'rcs-ms-synth',
		reportCardDefinitionId: 'rcd-ms-6',
		name: 'Synthèse trimestrielle',
		kind: 'group' as const,
		role: 'synthese' as const,
		order: 4,
		weight: 1,
	},
	{
		id: 'rcs-ms-appr',
		reportCardDefinitionId: 'rcd-ms-6',
		name: 'Appréciations',
		kind: 'group' as const,
		role: 'appreciation' as const,
		order: 5,
		weight: 1,
	},
	{
		id: 'rcs-ms-fond-subj-math',
		reportCardDefinitionId: 'rcd-ms-6',
		name: 'subj-math',
		kind: 'subject' as const,
		order: 1,
		weight: 1,
		parentSectionId: 'rcs-ms-fond',
		subjectId: 'subj-math',
	},
];

const classSubjectsSources = {
	classSubjectsRaw: [
		classSubject({ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math' }),
		classSubject({ id: 'cs-6b-math', classGroupId: '6b', subjectId: 'subj-math' }),
		classSubject({ id: 'cs-term-advmath', classGroupId: 'term-s', subjectId: 'subj-advmath' }),
	],
	subjectsRaw: [
		subject({ id: 'subj-math', name: 'Mathematics', coefficient: 3 }),
		subject({ id: 'subj-advmath', name: 'Advanced Mathematics', coefficient: 3 }),
	],
	subjectMattersRaw: [],
	staffAssignmentsRaw: [],
	staffMembersRaw: [],
	teachersRaw: [],
	teacherAssignmentsRaw: [],
};

describe('report cards definition mapping', () => {
	it('maps definition status from API enum', () => {
		expect(mapDefinitionStatus('published')).toBe('published');
		expect(mapDefinitionStatus('draft')).toBe('draft');
		expect(mapDefinitionStatus(undefined)).toBe('draft');
	});

	it('maps report card definitions from API fields without per-id tables', () => {
		const definitions = mapReportCardDefinitions(
			[...seedDefinitionsRaw],
			[...seedDefinitionSectionsRaw],
			classSubjectsSources,
		);

		expect(definitions.find(definition => definition.id === 'rcd-ms-6')).toMatchObject({
			gradeScaleId: 'gs-20',
			status: 'published',
		});
		expect(definitions.find(definition => definition.id === 'rcd-ms-draft')).toMatchObject({
			gradeScaleId: 'gs-20',
			status: 'draft',
		});
		const ms6 = definitions.find(definition => definition.id === 'rcd-ms-6');
		expect(ms6?.sections).toHaveLength(5);
		expect(ms6?.sections.find(section => section.id === 'rcs-ms-fond')).toMatchObject({
			sectionType: 'group',
			kind: 'matieres',
			coefficient: 2,
			children: [{
				sectionType: 'subject',
				subjectId: 'subj-math',
				subjectLabel: 'Mathématiques',
			}],
		});
		expect(ms6?.sections.find(section => section.id === 'rcs-ms-sci')).toMatchObject({
			sectionType: 'group',
			kind: 'matieres',
			coefficient: 1.5,
		});
		expect(ms6?.sections.find(section => section.id === 'rcs-ms-sport')).toMatchObject({
			sectionType: 'group',
			kind: 'matieres',
			coefficient: 1,
		});
		expect(ms6?.sections.find(section => section.id === 'rcs-ms-synth')).toMatchObject({
			sectionType: 'group',
			kind: 'synthese',
		});
		expect(ms6?.sections.find(section => section.id === 'rcs-ms-appr')).toMatchObject({
			sectionType: 'group',
			kind: 'appreciation',
		});
	});
});

describe('report cards subject resolution', () => {
	it('resolves class subject ids dynamically by class group', () => {
		expect(resolveClassSubjectId('subj-math', '6a', classSubjectsSources)).toBe('cs-6a-math');
		expect(resolveClassSubjectId('subj-math', '6b', classSubjectsSources)).toBe('cs-6b-math');
		expect(resolveClassSubjectId('subj-advmath', 'term-s', classSubjectsSources)).toBe('cs-term-advmath');
		expect(resolveClassSubjectId('subj-math', 'term-s', classSubjectsSources)).toBeUndefined();
	});

	it('maps catalog subject ids to display labels', () => {
		expect(subjectLabelForCatalogId('subj-math', classSubjectsSources)).toBe('Mathématiques');
		expect(subjectLabelForCatalogId('subj-advmath', classSubjectsSources)).toBe('Advanced Mathematics');
	});

	it('maps catalog subject ids to English labels when the UI language is English', () => {
		setLang('en');
		try {
			expect(subjectLabelForCatalogId('subj-math', classSubjectsSources)).toBe('Mathematics');
			expect(subjectLabelForCatalogId('subj-advmath', classSubjectsSources)).toBe('Advanced Mathematics');
		}
		finally {
			setLang('fr');
		}
	});
});

describe('report cards section role mapping', () => {
	it('maps API role to UI kind', () => {
		expect(mapSectionRole({ role: 'matieres', name: 'Matières' }, false)).toBe('matieres');
		expect(mapSectionRole({ role: 'synthese', name: 'Synthèse' }, false)).toBe('synthese');
	});

	it('derives matieres from subject children when role is absent', () => {
		expect(mapSectionRole({ name: 'Groupe' }, true)).toBe('matieres');
	});

	it('derives synthese and appreciation from section names', () => {
		expect(mapSectionRole({ name: 'Synthèse trimestrielle' }, false)).toBe('synthese');
		expect(mapSectionRole({ name: 'Appréciations' }, false)).toBe('appreciation');
	});
});

describe('report cards result mapping', () => {
	it('uses the captured subject-row label after explicit generation', () => {
		expect(mapSubjectMark({ classSubjectId: 'cs-6a-math', name: 'Applied mathematics', average: 18, weight: 1.5 }, classSubjectsSources)?.subjectName).toBe('Applied mathematics');
	});
	it('maps subject marks from API comment and weight', () => {
		const mark = mapSubjectMark({
			classSubjectId: 'cs-6a-math',
			name: 'subj-math',
			average: 18.5,
			weight: 2,
			comment: 'Excellent — maîtrise remarquable de l\'algèbre.',
		}, classSubjectsSources);

		expect(mark).toMatchObject({
			subjectId: 'cs-6a-math',
			average: 18.5,
			coefficient: 2,
			appreciation: 'Excellent — maîtrise remarquable de l\'algèbre.',
		});
	});

	it('maps report card results without per-id appreciation tables', () => {
		const results = mapReportCardResults(
			[{
				id: 'rcr-s1-t3',
				studentId: 's1',
				classGroupId: '6a',
				periodId: '2025-t3',
				reportCardDefinitionId: 'rcd-ms-6',
				status: 'published',
				overallAverage: 17.2,
				rank: 1,
				classSize: 6,
				attendanceSummary: {
					presentCount: 20,
					absenceCount: 1,
					excusedAbsenceCount: 0,
					lateCount: 0,
					total: 21,
					attendanceRate: 95,
				},
				assessmentResultCount: 1,
				sectionResults: [{
					sectionId: 'rcs-ms-fond',
					sectionKind: 'group',
					name: 'Matières fondamentales',
					average: 17.17,
					weight: 2,
					subResults: [{
						sectionId: 'rcs-ms-fond-subj-math',
						sectionKind: 'subject',
						name: 'subj-math',
						average: 18.5,
						weight: 2,
						comment: 'Excellent — maîtrise remarquable de l\'algèbre.',
						classSubjectId: 'cs-6a-math',
						subResults: [],
					}],
				}],
			} as unknown as components['schemas']['ReportCardResult']],
			[reportCardDefinition({
				id: 'rcd-ms-6',
				name: 'Bulletin trimestriel — Collège (6ème)',
				isDefault: true,
			})],
			classSubjectsSources,
		);

		const mathMark = results[0]?.sectionResults[0]?.marks.find(mark => mark.subjectId === 'cs-6a-math');
		expect(mathMark).toMatchObject({
			average: 18.5,
			coefficient: 2,
			appreciation: 'Excellent — maîtrise remarquable de l\'algèbre.',
		});
	});
});
