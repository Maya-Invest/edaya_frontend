import type { OnboardingStructureDraft } from '$lib/onboarding/types';
import { isGradeLevelTemplateKey } from '$lib/onboarding/structure-templates';

export function isStructureStepValid(structure: OnboardingStructureDraft): boolean {
	if (structure.models.length === 0) {
		return false;
	}
	if (structure.levels.length === 0) {
		return false;
	}

	return structure.levels.every(level =>
		isGradeLevelTemplateKey(level.gradeLevelId)
		&& Number.isInteger(level.classCount)
		&& level.classCount >= 1
		&& Number.isInteger(level.capacity)
		&& level.capacity >= 1,
	);
}
