import { describe, expect, it } from 'bun:test';
import { createEmptyDraft } from './draft-storage';
import { toggleStructureModel } from './structure-step-helpers';
import { isStructureStepValid } from './structure-step-validation';

describe('structure onboarding', () => {
	it('adds college levels when collège is selected', () => {
		const draft = createEmptyDraft();
		const next = toggleStructureModel(draft.structure, 'college', true);
		expect(next.models).toEqual(['college']);
		expect(next.levels.map(level => level.gradeLevelId)).toEqual(['gl-6', 'gl-5', 'gl-4', 'gl-3']);
		expect(isStructureStepValid(next)).toBe(true);
	});

	it('combines collège and lycée levels', () => {
		let structure = createEmptyDraft().structure;
		structure = toggleStructureModel(structure, 'college', true);
		structure = toggleStructureModel(structure, 'lycee', true);
		expect(structure.levels).toHaveLength(7);
	});
});
