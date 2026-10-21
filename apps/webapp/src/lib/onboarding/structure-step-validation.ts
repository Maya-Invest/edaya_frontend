import type { StructureTemplateCatalog } from '$lib/onboarding/structure-template-catalog';
import type { OnboardingStructureDraft } from '$lib/onboarding/types';
import { subjectsForGradeLevelIds } from '$lib/onboarding/structure-template-model';

export function isStructureStepValid(
	structure: OnboardingStructureDraft,
	catalog?: StructureTemplateCatalog | null,
): boolean {
	if (structure.models.length === 0) {
		return false;
	}

	const configuredLevels = structure.levels.filter(level => level.classCount >= 1);
	if (configuredLevels.length === 0) {
		return false;
	}

	const mappings = structure.disciplineMappings ?? [];
	if (!mappings.length || mappings.some(mapping => !mapping.disciplineCode.trim() || !mapping.disciplineName.trim()))
		return false;
	const namesByCode = new Map<string, string>();
	for (const mapping of mappings) {
		const code = mapping.disciplineCode.trim().toUpperCase();
		const name = mapping.disciplineName.trim();
		if (namesByCode.has(code) && namesByCode.get(code) !== name)
			return false;
		namesByCode.set(code, name);
	}
	if (catalog && subjectsForGradeLevelIds(catalog, configuredLevels.map(level => level.gradeLevelId)).some(subject => !mappings.some(mapping => mapping.subjectCode === subject.code)))
		return false;
	return configuredLevels.every((level) => {
		if (!level.gradeLevelId.trim()) {
			return false;
		}
		if (catalog && !catalog.byId.has(level.gradeLevelId)) {
			return false;
		}
		return Number.isInteger(level.classCount)
			&& level.classCount >= 1
			&& Number.isInteger(level.capacity)
			&& level.capacity >= 1;
	});
}
