import { describe, expect, it } from 'bun:test';
import {
	buildCompleteStepSummary,
	previewMatters,
} from '$lib/onboarding/complete-step-summary';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';
import {
	buildCatalogFromTemplates,
	subjectsForGradeLevelIds,
} from '$lib/onboarding/structure-template-catalog';
import type { StructureTemplateDefinition } from '$lib/onboarding/structure-template-catalog';

function level(
	templateId: string,
	code: string,
	name: string,
	order: number,
): StructureTemplateDefinition['gradeLevels'][number] {
	return {
		id: `${templateId}:${code}`,
		code,
		name,
		shortLabel: code,
		order,
	};
}

const FIXTURE_TEMPLATES: StructureTemplateDefinition[] = [
	{
		id: 'ci-college',
		countryCode: 'CI',
		label: "Côte d'Ivoire — Collège",
		description: 'Lower Secondary Education (4 years)',
		cycle: 'Collège',
		gradeLevels: [
			level('ci-college', '6EME', 'Sixième', 1),
			level('ci-college', '5EME', 'Cinquième', 2),
		],
		subjects: [
			{ code: 'FR', shortName: 'Français', domain: 'Langues', defaultCoefficient: 3 },
			{ code: 'MATH', shortName: 'Mathématiques', domain: 'Sciences', defaultCoefficient: 3 },
		],
		curriculum: [
			{
				levelCode: '6EME',
				subjectCode: 'FR',
				coefficient: 3,
				matters: ['Lecture', 'Grammaire', 'Conjugaison', 'Expression écrite'],
			},
			{
				levelCode: '6EME',
				subjectCode: 'MATH',
				coefficient: 3,
				matters: ['Nombres', 'Fractions', 'Géométrie'],
			},
			{
				levelCode: '5EME',
				subjectCode: 'FR',
				coefficient: 3,
				matters: ['Grammaire'],
			},
		],
	},
];

const catalog = buildCatalogFromTemplates(FIXTURE_TEMPLATES, 'CI');

describe('subjectsForGradeLevelIds', () => {
	it('dedupes subjects across selected levels and keeps matters', () => {
		const subjects = subjectsForGradeLevelIds(catalog, ['ci-college:6EME', 'ci-college:5EME']);
		expect(subjects.map(subject => subject.code)).toEqual(['FR', 'MATH']);
		expect(subjects.find(subject => subject.code === 'FR')?.matters).toEqual([
			'Lecture',
			'Grammaire',
			'Conjugaison',
			'Expression écrite',
		]);
	});
});

describe('previewMatters', () => {
	it('returns first two truncated titles and a more count', () => {
		expect(previewMatters([
			'Lecture et compréhension de textes narratifs et documentaires',
			'Grammaire',
			'Conjugaison',
		])).toEqual({
			preview: [
				'Lecture et compréhension de textes narr…',
				'Grammaire',
			],
			more: 1,
		});
	});
});

describe('buildCompleteStepSummary', () => {
	it('nests classes and subjects with matters under each level', () => {
		const draft = createEmptyDraft();
		draft.school = {
			...draft.school,
			name: 'Collège Test',
			city: 'Abidjan',
			country: "Côte d'Ivoire",
		};
		draft.structure = {
			models: ['college'],
			levels: [
				{ gradeLevelId: 'ci-college:6EME', classCount: 2, capacity: 30 },
				{ gradeLevelId: 'ci-college:5EME', classCount: 0, capacity: 30 },
			],
		};

		const summary = buildCompleteStepSummary(draft, catalog);
		expect(summary.schoolLine).toBe("Collège Test · Abidjan · Côte d'Ivoire");
		expect(summary.levels).toHaveLength(1);
		expect(summary.levels[0]).toMatchObject({
			gradeLevelId: 'ci-college:6EME',
			code: '6EME',
			model: 'college',
			classCount: 2,
			classNames: ['6EME 1', '6EME 2'],
		});
		expect(summary.levels[0]?.subjects.map(subject => subject.code)).toEqual(['FR', 'MATH']);
		expect(summary.levels[0]?.subjects.find(subject => subject.code === 'MATH')?.matters).toEqual([
			'Nombres',
			'Fractions',
			'Géométrie',
		]);
		expect(summary.levelCount).toBe(1);
		expect(summary.classCount).toBe(2);
		expect(summary.subjectCount).toBe(2);
	});

	it('includes only complete staff invites', () => {
		const draft = createEmptyDraft();
		draft.structure = {
			models: ['college'],
			levels: [{ gradeLevelId: 'ci-college:6EME', classCount: 1, capacity: 30 }],
		};
		draft.staffInvites = [
			{ id: '1', email: 'cpe@school.fr', role: 'cpe' },
			{ id: '2', email: '', role: 'secretary' },
			{ id: '3', email: 'bad', role: '' },
			{ id: '4', email: 'it@school.fr', role: 'it_admin' },
		];

		const summary = buildCompleteStepSummary(draft, catalog);
		expect(summary.staffInvites).toEqual([
			{ email: 'cpe@school.fr', role: 'cpe', roleLabelKey: 'onboarding.staff.roleCpe' },
			{ email: 'it@school.fr', role: 'it_admin', roleLabelKey: 'onboarding.staff.roleItAdmin' },
		]);
		expect(summary.inviteCount).toBe(2);
	});
});
