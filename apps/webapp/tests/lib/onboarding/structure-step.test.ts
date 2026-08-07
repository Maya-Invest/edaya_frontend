import { describe, expect, it } from 'bun:test';
import { createEmptyDraft } from '$lib/onboarding/draft-storage';
import {
	structureSummary,
	syncStructureLevels,
	toggleStructureModel,
	updateStructureLevel,
} from '$lib/onboarding/structure-step-helpers';
import { isStructureStepValid } from '$lib/onboarding/structure-step-validation';
import { previewClassNamesFromCatalog } from '$lib/onboarding/class-naming';
import { buildCatalogFromTemplates } from '$lib/onboarding/structure-template-model';
import type { StructureTemplateDefinition } from '$lib/onboarding/structure-template-model';
import { toApiStructureTemplateIds } from '$lib/onboarding/structure-templates';

/** `shortLabel` is deliberately distinct from `code` so the naming assertions prove which one is the stem. */
function level(
	templateId: string,
	code: string,
	name: string,
	shortLabel: string,
	order: number,
): StructureTemplateDefinition['gradeLevels'][number] {
	return {
		id: `${templateId}:${code}`,
		code,
		name,
		shortLabel,
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
			level('ci-college', '6EME', 'Sixième', '6ème', 1),
			level('ci-college', '5EME', 'Cinquième', '5ème', 2),
			level('ci-college', '4EME', 'Quatrième', '4ème', 3),
			level('ci-college', '3EME', 'Troisième', '3ème', 4),
		],
		subjects: [{ code: 'FR', shortName: 'Français', domain: 'Langues', defaultCoefficient: 3 }],
		curriculum: [{ levelCode: '6EME', subjectCode: 'FR', coefficient: 3, matters: ['Lecture'] }],
	},
	{
		id: 'ci-lycee',
		countryCode: 'CI',
		label: "Côte d'Ivoire — Lycée",
		description: 'Upper Secondary Education (3 years)',
		cycle: 'Lycée',
		gradeLevels: [
			level('ci-lycee', '2NDA', 'Seconde A', '2nde A', 1),
			level('ci-lycee', '2NDC', 'Seconde C', '2nde C', 2),
			level('ci-lycee', '1ERA', 'Première A', '1ère A', 3),
			level('ci-lycee', '1ERC', 'Première C', '1ère C', 4),
			level('ci-lycee', '1ERD', 'Première D', '1ère D', 5),
			level('ci-lycee', 'TLEA', 'Terminale A', 'Tle A', 6),
			level('ci-lycee', 'TLEC', 'Terminale C', 'Tle C', 7),
			level('ci-lycee', 'TLED', 'Terminale D', 'Tle D', 8),
		],
		subjects: [{ code: 'FR', shortName: 'Français', domain: 'Langues', defaultCoefficient: 3 }],
		curriculum: [{ levelCode: '1ERA', subjectCode: 'FR', coefficient: 3, matters: ['Dissertation'] }],
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

		const premiereA = catalog.byId.get('ci-lycee:1ERA');
		const secondeA = catalog.byId.get('ci-lycee:2NDA');
		const sixieme = catalog.byId.get('ci-college:6EME');
		expect(premiereA).toBeDefined();
		expect(secondeA).toBeDefined();
		expect(sixieme).toBeDefined();

		expect(previewClassNamesFromCatalog(premiereA!, 2)).toEqual(['1ère A 1', '1ère A 2']);
		expect(previewClassNamesFromCatalog(secondeA!, 2)).toEqual(['2nde A 1', '2nde A 2']);
		expect(previewClassNamesFromCatalog(sixieme!, 2, 'alphabetical')).toEqual(['6ème A', '6ème B']);
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
				classNamingMode: level.classNamingMode,
			}));

		expect(toApiStructureTemplateIds(structure.models)).toEqual(['ci-lycee']);
		expect(payloadLevels).toEqual([
			{
				gradeLevelId: 'ci-lycee:1ERA',
				classCount: 1,
				capacity: 35,
				classNamingMode: 'numerical',
			},
		]);
	});
});
