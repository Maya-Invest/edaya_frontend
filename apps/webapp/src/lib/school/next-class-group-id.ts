/**
 * Mnemonic class group ids — shared by import, UI create, and onboarding expectations.
 * Prefixes come from seed-id map (not fixture display labels).
 */
import {
	GRADE_LEVEL_CLASS_ID_PREFIX,
	structureGradeLevelSeedId,
} from '$lib/onboarding/legacy-gl-map';

/**
 * Resolves to the onboarding seed id (`gl-6`, …) when the level matches a known template/seed id.
 * Falls back to the raw gradeLevelId for custom levels.
 */
export function resolveGradeLevelKeyForClassId(
	gradeLevelId: string,
	_gradeLevelName?: string,
): string {
	return structureGradeLevelSeedId(gradeLevelId);
}

function classIdForIndex(prefix: string, index: number): string {
	return index === 0 && prefix === '2' ? '2nd' : `${prefix}${String.fromCharCode(97 + index)}`;
}

export function nextClassGroupId(
	gradeLevelKey: string,
	takenIds: ReadonlySet<string>,
	siblingCountByGrade: Map<string, number>,
): string {
	const seedId = structureGradeLevelSeedId(gradeLevelKey);
	const prefix = GRADE_LEVEL_CLASS_ID_PREFIX[seedId] ?? 'cls';
	let index = siblingCountByGrade.get(seedId) ?? siblingCountByGrade.get(gradeLevelKey) ?? 0;
	let id = classIdForIndex(prefix, index);

	while (takenIds.has(id)) {
		index += 1;
		id = classIdForIndex(prefix, index);
	}

	siblingCountByGrade.set(seedId, index + 1);
	return id;
}

export function nextClassGroupIdFromExistingClasses(
	gradeLevelId: string,
	existingClassIds: Iterable<string>,
	options?: {
		gradeLevelName?: string;
		siblingCountByGrade?: Map<string, number>;
	},
): string {
	const key = resolveGradeLevelKeyForClassId(gradeLevelId, options?.gradeLevelName);
	const takenIds = new Set(existingClassIds);
	const counts = options?.siblingCountByGrade ?? new Map<string, number>();
	return nextClassGroupId(key, takenIds, counts);
}
