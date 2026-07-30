import { describe, expect, it } from 'bun:test';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';
import {
	structureSummary,
	syncStructureLevels,
	toggleStructureModel,
	updateStructureLevel,
} from '$lib/onboarding/structure-step-helpers';
import { isStructureStepValid } from '$lib/onboarding/structure-step-validation';
import {
	buildCatalogFromTemplates,
	previewClassNamesFromCatalog,
} from '$lib/onboarding/structure-template-catalog';
import { toApiStructureTemplateIds } from '$lib/onboarding/structure-templates';
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
			level('ci-college', '4EME', 'Quatrième', 3),
			level('ci-college', '3EME', 'Troisième', 4),
		],
		subjects: [{ code: 'FR', shortName: 'Français', domain: 'Langues', defaultCoefficient: 3 }],
		curriculum: [{ levelCodes: ['6EME'], subjectCode: 'FR', coefficient: 3, matters: ['Lecture'] }],
	},
	{
		id: 'ci-lycee',
		countryCode: 'CI',
		label: "Côte d'Ivoire — Lycée",
		description: 'Upper Secondary Education (3 years)',
		cycle: 'Lycée',
		gradeLevels: [
			level('ci-lycee', '2NDA', 'Seconde A', 1),
			level('ci-lycee', '2NDC', 'Seconde C', 2),
			level('ci-lycee', '1ERA', 'Première A', 3),
			level('ci-lycee', '1ERC', 'Première C', 4),
			level('ci-lycee', '1ERD', 'Première D', 5),
			level('ci-lycee', 'TLEA', 'Terminale A', 6),
			level('ci-lycee', 'TLEC', 'Terminale C', 7),
			level('ci-lycee', 'TLED', 'Terminale D', 8),
		],
		subjects: [{ code: 'FR', shortName: 'Français', domain: 'Langues', defaultCoefficient: 3 }],
		curriculum: [{ levelCodes: ['1ERA'], subjectCode: 'FR', coefficient: 3, matters: ['Dissertation'] }],
	},
];

const catalog = buildCatalogFromTemplates(FIXTURE_TEMPLATES, 'CI');

describe('structure onboarding', () => {
	it('adds college levels when collège is selected', () => {
		const draft = createEmptyDraft();
		const next = toggleStructureModel(draft.structure, 'college', true, catalog);
		expect(next.models).toEqual(['college']);
		expect(next.levels.map(entry => entry.gradeLevelId)).toEqual([
			'ci-college:6EME',
			'ci-college:5EME',
			'ci-college:4EME',
			'ci-college:3EME',
		]);
		expect(next.levels.every(entry => entry.classCount === 0)).toBe(true);
		expect(isStructureStepValid(next, catalog)).toBe(false);

		const configured = updateStructureLevel(next, 'ci-college:6EME', { classCount: 1 });
		expect(isStructureStepValid(configured, catalog)).toBe(true);
	});

	it('combines collège and lycée levels from the catalog', () => {
		let structure = createEmptyDraft().structure;
		structure = toggleStructureModel(structure, 'college', true, catalog);
		structure = toggleStructureModel(structure, 'lycee', true, catalog);
		expect(structure.levels).toHaveLength(12);
		expect(structure.levels.some(entry => entry.gradeLevelId === 'ci-lycee:1ERA')).toBe(true);
	});

	it('keeps only selected models when syncing', () => {
		let structure = createEmptyDraft().structure;
		structure = toggleStructureModel(structure, 'college', true, catalog);
		structure = toggleStructureModel(structure, 'lycee', true, catalog);
		structure = toggleStructureModel(structure, 'college', false, catalog);
		expect(structure.models).toEqual(['lycee']);
		expect(structure.levels).toHaveLength(8);
		expect(syncStructureLevels(structure, catalog).levels).toHaveLength(8);
	});

	it('counts only levels with classCount >= 1 in the summary', () => {
		let structure = toggleStructureModel(createEmptyDraft().structure, 'college', true, catalog);
		structure = updateStructureLevel(structure, 'ci-college:6EME', { classCount: 2 });
		structure = updateStructureLevel(structure, 'ci-college:5EME', { classCount: 1 });
		expect(structureSummary(structure)).toEqual({ levelCount: 2, classCount: 3 });
	});

	it('maps UI models to API structure template ids', () => {
		expect(toApiStructureTemplateIds(['college'])).toEqual(['ci-college']);
		expect(toApiStructureTemplateIds(['college', 'lycee'])).toEqual(['ci-college', 'ci-lycee']);
	});

	it('builds catalog grade levels and preview class names from templates', () => {
		expect(catalog.gradeLevels).toHaveLength(12);
		expect(catalog.byId.get('ci-lycee:1ERA')?.name).toBe('Première A');
		expect(previewClassNamesFromCatalog(catalog.byId.get('ci-lycee:1ERA')!, 2)).toEqual([
			'1ERA 1',
			'1ERA 2',
		]);
		expect(previewClassNamesFromCatalog(catalog.byId.get('ci-lycee:2NDA')!, 2)).toEqual([
			'2NDA 1',
			'2NDA 2',
		]);
	});

	it('builds submit payload levels with api ids and classCount >= 1 only', () => {
		let structure = toggleStructureModel(createEmptyDraft().structure, 'lycee', true, catalog);
		structure = updateStructureLevel(structure, 'ci-lycee:1ERA', { classCount: 1, capacity: 35 });
		structure = updateStructureLevel(structure, 'ci-lycee:2NDA', { classCount: 0 });

		const payloadLevels = structure.levels
			.filter(level => level.classCount >= 1 && level.gradeLevelId.trim())
			.map(level => ({
				gradeLevelId: level.gradeLevelId,
				classCount: level.classCount,
				capacity: level.capacity,
			}));

		expect(toApiStructureTemplateIds(structure.models)).toEqual(['ci-lycee']);
		expect(payloadLevels).toEqual([
			{ gradeLevelId: 'ci-lycee:1ERA', classCount: 1, capacity: 35 },
		]);
	});
});
