import type { StructureTemplateCatalog } from '$lib/onboarding/structure-template-catalog';
import type { StructureModel } from '$lib/onboarding/structure-templates';
import type {
	OnboardingStructureDraft,
	OnboardingStructureLevelDraft,
} from '$lib/onboarding/types';
import {
	getCatalogGradeLevel,
	gradeLevelsForModels,
} from '$lib/onboarding/structure-template-catalog';

const DEFAULT_CLASS_COUNT = 0;
const DEFAULT_CAPACITY = 30;

function defaultLevel(gradeLevelId: string): OnboardingStructureLevelDraft {
	return {
		gradeLevelId,
		classCount: DEFAULT_CLASS_COUNT,
		capacity: DEFAULT_CAPACITY,
	};
}

export function syncStructureLevels(
	structure: OnboardingStructureDraft,
	catalog: StructureTemplateCatalog,
): OnboardingStructureDraft {
	const catalogLevels = gradeLevelsForModels(catalog, structure.models);
	const allowedIds = new Set(catalogLevels.map(level => level.id));
	const existingById = new Map(
		structure.levels
			.filter(level => allowedIds.has(level.gradeLevelId))
			.map(level => [level.gradeLevelId, level]),
	);

	const levels = catalogLevels.map((catalogLevel) => {
		const existing = existingById.get(catalogLevel.id);
		return existing
			? {
					...existing,
					gradeLevelId: catalogLevel.id,
					classCount: Math.max(0, existing.classCount),
					capacity: existing.capacity,
				}
			: defaultLevel(catalogLevel.id);
	});

	return {
		models: [...structure.models],
		levels,
	};
}

export function toggleStructureModel(
	structure: OnboardingStructureDraft,
	model: StructureModel,
	enabled: boolean,
	catalog: StructureTemplateCatalog,
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
	}, catalog);
}

export function updateStructureLevel(
	structure: OnboardingStructureDraft,
	gradeLevelId: string,
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
	const configured = structure.levels.filter(level => level.classCount >= 1);
	const levelCount = configured.length;
	const classCount = configured.reduce((total, level) => total + level.classCount, 0);
	return { levelCount, classCount };
}

export function gradeLevelLabel(gradeLevelId: string, catalog: StructureTemplateCatalog): string {
	const level = getCatalogGradeLevel(catalog, gradeLevelId);
	if (!level) {
		return gradeLevelId;
	}
	return level.code;
}
