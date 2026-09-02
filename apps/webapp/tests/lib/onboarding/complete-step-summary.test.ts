import { describe, expect, it } from 'bun:test';
import {
	buildCompleteStepSummary,
	previewMatters,
} from '$lib/onboarding/complete-step-summary';
import { catalogClassName, catalogPeriodLabel, catalogSubjectName } from '$lib/i18n/catalog-label';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';
import { academicYearLabelFromDates } from '$lib/onboarding/school-step-defaults';
import {
	buildCatalogFromTemplates,
	subjectsForGradeLevelIds,
} from '$lib/onboarding/structure-template-model';
import type { StructureTemplateDefinition } from '$lib/onboarding/structure-template-model';

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
				{ gradeLevelId: 'ci-college:6EME', classCount: 2, capacity: 30, classNamingMode: 'numerical' },
				{ gradeLevelId: 'ci-college:5EME', classCount: 0, capacity: 30, classNamingMode: 'numerical' },
			],
		};

		const summary = buildCompleteStepSummary(draft, catalog);
		expect(summary.schoolLine).toBe("Collège Test · Abidjan · Côte d'Ivoire");
		expect(summary.academicYearLabel).toBe(
			academicYearLabelFromDates(draft.school.academicYearStart, draft.school.academicYearEnd),
		);
		expect(summary.academicYearRange).toBe(
			`${draft.school.academicYearStart} → ${draft.school.academicYearEnd}`,
		);
		expect(summary.periodTypeLabelKey).toBe('onboarding.periodType.trimester');
		expect(summary.periods).toEqual(
			draft.school.periods.map(period => ({
				label: period.label,
				start: period.start,
				end: period.end,
			})),
		);
		expect(summary.periods.length).toBeGreaterThan(0);
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
			levels: [{ gradeLevelId: 'ci-college:6EME', classCount: 1, capacity: 30, classNamingMode: 'numerical' }],
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

	it('derives the academic year label from dates instead of a free-text name', () => {
		const draft = createEmptyDraft();
		draft.school.academicYearLabel = 'anneeteny';
		draft.school.academicYearStart = '2026-09-01';
		draft.school.academicYearEnd = '2027-07-03';

		const summary = buildCompleteStepSummary(draft, catalog);
		expect(summary.academicYearLabel).toBe('2026-2027');
	});

	it('keeps canonical FR catalog values so the recap can localize them', () => {
		const draft = createEmptyDraft();
		draft.structure = {
			models: ['college'],
			levels: [{ gradeLevelId: 'ci-college:6EME', classCount: 2, capacity: 30, classNamingMode: 'numerical' }],
		};

		const summary = buildCompleteStepSummary(draft, catalog);
		expect(summary.levels[0]?.classNames).toEqual(['6EME 1', '6EME 2']);
		expect(summary.levels[0]?.subjects.find(subject => subject.code === 'FR')?.name).toBe('Français');
		expect(summary.periods[0]?.label.startsWith('Trimestre') || summary.periods[0]?.label.startsWith('Semestre')).toBe(true);
		expect(catalogSubjectName('Français', 'en', 'FR')).toBe('French');
		expect(catalogSubjectName('Espagnol', 'en', 'ESP')).toBe('Spanish');
		expect(catalogClassName('2nde A 1', 'en')).toBe('10th A 1');
		expect(catalogPeriodLabel(summary.periods[0]?.label ?? '', 'en')).toMatch(/^(Term|Semester) /);
	});
});

