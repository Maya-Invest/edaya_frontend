import type { DatasetCatalog } from '$lib/onboarding/dataset-model';
import type { OnboardingStructureDraft } from '$lib/onboarding/types';
import { sameDataset } from '$lib/onboarding/dataset-model';

export function isStructureStepValid(structure: OnboardingStructureDraft, catalog?: DatasetCatalog | null): boolean {
	if (!catalog || !sameDataset(structure.dataset, catalog.dataset) || !structure.templates.length)
		return false;
	if (new Set(structure.templates).size !== structure.templates.length || structure.templates.some(id => !catalog.dataset.templates.some(template => template.id === id)))
		return false;
	if (new Set(structure.levels.map(row => row.gradeLevelId)).size !== structure.levels.length)
		return false;
	if (structure.levels.some(row => !Number.isInteger(row.classCount) || row.classCount < 0))
		return false;
	const levels = structure.levels.filter(level => level.classCount > 0);
	return levels.length > 0 && levels.every((level) => {
		const definition = catalog.byId.get(level.gradeLevelId);
		return definition && structure.templates.includes(definition.templateId) && Number.isInteger(level.capacity) && level.capacity > 0 && ['numerical', 'alphabetical'].includes(level.classNamingMode);
	});
}
