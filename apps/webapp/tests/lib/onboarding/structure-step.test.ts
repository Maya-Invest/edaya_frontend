import { describe, expect, it } from 'bun:test';
import { createDatasetDraft as createEmptyDraft, catalog } from './dataset-fixture';
import {
	structureSummary,
	syncStructureLevels,
	toggleStructureTemplate,
	updateStructureLevel,
} from '$lib/onboarding/structure-step-helpers';
import { isStructureStepValid } from '$lib/onboarding/structure-step-validation';
import { previewClassNamesFromCatalog } from '$lib/onboarding/class-naming';

describe('structure onboarding', () => {
	it('adds college levels when collège is selected', () => {
		const draft = createEmptyDraft();
		const next = toggleStructureTemplate(draft.structure, 'ci-college', true, catalog);
		expect(next.templates).toEqual(['ci-college']);
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
		structure = toggleStructureTemplate(structure, 'ci-college', true, catalog);
		structure = toggleStructureTemplate(structure, 'ci-lycee', true, catalog);
		expect(structure.levels).toHaveLength(12);
		expect(structure.levels.some(entry => entry.gradeLevelId === 'ci-lycee:1ERA')).toBe(true);
	});

	it('keeps only selected models when syncing', () => {
		let structure = createEmptyDraft().structure;
		structure = toggleStructureTemplate(structure, 'ci-college', true, catalog);
		structure = toggleStructureTemplate(structure, 'ci-lycee', true, catalog);
		structure = toggleStructureTemplate(structure, 'ci-college', false, catalog);
		expect(structure.templates).toEqual(['ci-lycee']);
		expect(structure.levels).toHaveLength(8);
		expect(syncStructureLevels(structure, catalog).levels).toHaveLength(8);
	});

	it('counts only levels with classCount >= 1 in the summary', () => {
		let structure = toggleStructureTemplate(createEmptyDraft().structure, 'ci-college', true, catalog);
		structure = updateStructureLevel(structure, 'ci-college:6EME', { classCount: 2 });
		structure = updateStructureLevel(structure, 'ci-college:5EME', { classCount: 1 });
		expect(structureSummary(structure)).toEqual({ levelCount: 2, classCount: 3 });
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
		let structure = toggleStructureTemplate(createEmptyDraft().structure, 'ci-lycee', true, catalog);
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

		expect(structure.templates).toEqual(['ci-lycee']);
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
