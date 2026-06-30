import type { GradeLevelTemplateKey, StructureModel } from '$lib/onboarding/structure-templates';
import type {
	OnboardingStructureDraft,
	OnboardingStructureLevelDraft,
} from '$lib/onboarding/types';
import {
	GRADE_LEVEL_TEMPLATES,
	isGradeLevelTemplateKey,
	sortedStructureLevels,
	templateKeysForModel,

} from '$lib/onboarding/structure-templates';

const DEFAULT_CLASS_COUNT = 1;
const DEFAULT_CAPACITY = 30;

function defaultLevel(gradeLevelId: GradeLevelTemplateKey): OnboardingStructureLevelDraft {
	return {
		gradeLevelId,
		classCount: DEFAULT_CLASS_COUNT,
		capacity: DEFAULT_CAPACITY,
	};
}

export function syncStructureLevels(structure: OnboardingStructureDraft): OnboardingStructureDraft {
	const allowedKeys = new Set<GradeLevelTemplateKey>();
	for (const model of structure.models) {
		for (const key of templateKeysForModel(model)) {
			allowedKeys.add(key);
		}
	}

	const keptLevels = structure.levels.filter(level =>
		isGradeLevelTemplateKey(level.gradeLevelId) && allowedKeys.has(level.gradeLevelId),
	);

	const existingKeys = new Set(
		keptLevels
			.map(level => level.gradeLevelId)
			.filter(isGradeLevelTemplateKey),
	);

	for (const model of structure.models) {
		for (const key of templateKeysForModel(model)) {
			if (!existingKeys.has(key)) {
				keptLevels.push(defaultLevel(key));
			}
		}
	}

	return {
		models: [...structure.models],
		levels: sortedStructureLevels(keptLevels),
	};
}

export function toggleStructureModel(
	structure: OnboardingStructureDraft,
	model: StructureModel,
	enabled: boolean,
): OnboardingStructureDraft {
	const models = new Set(structure.models);
	if (enabled) {
		models.add(model);
	}
	else {
		models.delete(model);
	}

	return syncStructureLevels({
		...structure,
		models: [...models],
	});
}

export function updateStructureLevel(
	structure: OnboardingStructureDraft,
	gradeLevelId: GradeLevelTemplateKey,
	changes: Partial<Pick<OnboardingStructureLevelDraft, 'classCount' | 'capacity'>>,
): OnboardingStructureDraft {
	return {
		...structure,
		levels: structure.levels.map(level =>
			level.gradeLevelId === gradeLevelId
				? {
						...level,
						...changes,
						classCount: changes.classCount ?? level.classCount,
						capacity: changes.capacity ?? level.capacity,
					}
				: level,
		),
	};
}

export function structureSummary(structure: OnboardingStructureDraft): {
	levelCount: number;
	classCount: number;
} {
	const levelCount = structure.levels.length;
	const classCount = structure.levels.reduce((total, level) => total + level.classCount, 0);
	return { levelCount, classCount };
}

export function gradeLevelLabel(gradeLevelId: string): string {
	if (!isGradeLevelTemplateKey(gradeLevelId)) {
		return gradeLevelId;
	}
	return GRADE_LEVEL_TEMPLATES[gradeLevelId].name;
}
