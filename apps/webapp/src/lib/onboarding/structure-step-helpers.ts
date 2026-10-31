import type { Lang } from '$lib/i18n/dictionaries';
import type { DatasetCatalog } from '$lib/onboarding/dataset-model';
import type {
	OnboardingClassNamingMode,
	OnboardingStructureDraft,
	OnboardingStructureLevelDraft,
} from '$lib/onboarding/types';
import { catalogGradeName } from '$lib/i18n/catalog-label';
import {
	getCatalogGradeLevel,
	gradeLevelsForTemplates,
} from '$lib/onboarding/dataset-model';

const DEFAULT_CLASS_COUNT = 0;
const DEFAULT_CAPACITY = 30;
const DEFAULT_CLASS_NAMING_MODE: OnboardingClassNamingMode = 'numerical';

function defaultLevel(gradeLevelId: string): OnboardingStructureLevelDraft {
	return {
		gradeLevelId,
		classCount: DEFAULT_CLASS_COUNT,
		capacity: DEFAULT_CAPACITY,
		classNamingMode: DEFAULT_CLASS_NAMING_MODE,
	};
}

export function syncStructureLevels(
	structure: OnboardingStructureDraft,
	catalog: DatasetCatalog,
): OnboardingStructureDraft {
	const catalogLevels = gradeLevelsForTemplates(catalog, structure.templates);
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
					classNamingMode: existing.classNamingMode ?? DEFAULT_CLASS_NAMING_MODE,
				}
			: defaultLevel(catalogLevel.id);
	});

	return {
		dataset: structure.dataset,
		templates: [...structure.templates],
		levels,
	};
}

export function toggleStructureTemplate(
	structure: OnboardingStructureDraft,
	templateId: string,
	enabled: boolean,
	catalog: DatasetCatalog,
): OnboardingStructureDraft {
	const templateIds = new Set(structure.templates);
	if (enabled) {
		templateIds.add(templateId);
	}
	else {
		templateIds.delete(templateId);
	}

	return syncStructureLevels({
		...structure,
		templates: [...templateIds],
	}, catalog);
}

export function updateStructureLevel(
	structure: OnboardingStructureDraft,
	gradeLevelId: string,
	changes: Partial<Pick<OnboardingStructureLevelDraft, 'classCount' | 'capacity' | 'classNamingMode'>>,
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
						classNamingMode: changes.classNamingMode ?? level.classNamingMode,
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

/** Prefer the dataset level `name` for the structure row title. */
export function gradeLevelLabel(
	gradeLevelId: string,
	catalog: DatasetCatalog,
	lang: Lang = 'fr',
): string {
	const level = getCatalogGradeLevel(catalog, gradeLevelId);
	if (!level) {
		return gradeLevelId;
	}
	return catalogGradeName(level.name || level.code, lang, level.code);
}
