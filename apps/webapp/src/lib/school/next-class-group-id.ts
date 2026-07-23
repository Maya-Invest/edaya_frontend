import { normalizeGradeLevelImportKey } from '$lib/import/shared/normalize-grade-level-import-key';

/** Mnemonic class group ids — shared by import, UI create, and onboarding expectations. */
export const GRADE_LEVEL_CLASS_ID_PREFIX: Record<string, string> = {
	'gl-6': '6',
	'gl-5': '5',
	'gl-4': '4',
	'gl-3': '3',
	'gl-2': '2',
	'gl-1': '1st',
	'gl-t': 'term',
};

const CANONICAL_GRADE_TO_GL: Record<string, string> = {
	'6eme': 'gl-6',
	'5eme': 'gl-5',
	'4eme': 'gl-4',
	'3eme': 'gl-3',
	'2nde': 'gl-2',
	'1ere': 'gl-1',
	'terminale': 'gl-t',
};

/**
 * Class id prefixes use `gl-6`, not the entity uuid, when the level is a standard CI collège/lycée year.
 */
export function resolveGradeLevelKeyForClassId(
	gradeLevelId: string,
	gradeLevelName?: string,
): string {
	if (Object.hasOwn(GRADE_LEVEL_CLASS_ID_PREFIX, gradeLevelId)) {
		return gradeLevelId;
	}
	if (gradeLevelName) {
		const mapped = CANONICAL_GRADE_TO_GL[normalizeGradeLevelImportKey(gradeLevelName)];
		if (mapped) {
			return mapped;
		}
	}
	return gradeLevelId;
}

function classIdForIndex(prefix: string, index: number): string {
	return index === 0 && prefix === '2' ? '2nd' : `${prefix}${String.fromCharCode(97 + index)}`;
}

export function nextClassGroupId(
	gradeLevelId: string,
	takenIds: ReadonlySet<string>,
	siblingCountByGrade: Map<string, number>,
): string {
	const prefix = GRADE_LEVEL_CLASS_ID_PREFIX[gradeLevelId] ?? 'cls';
	let index = siblingCountByGrade.get(gradeLevelId) ?? 0;
	let id = classIdForIndex(prefix, index);

	while (takenIds.has(id)) {
		index += 1;
		id = classIdForIndex(prefix, index);
	}

	siblingCountByGrade.set(gradeLevelId, index + 1);
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
