import { normalizeGradeLevelImportKey } from '$lib/import/shared/normalize-grade-level-import-key';

/** Mnemonic class group ids — shared by import, UI create, and onboarding expectations. */
export const GRADE_LEVEL_CLASS_ID_PREFIX: Record<string, string> = {
	'gl-6': '6',
	'gl-5': '5',
	'gl-4': '4',
	'gl-3': '3',
	'gl-2nda': '2nda',
	'gl-2': '2',
	'gl-1era': '1era',
	'gl-1': '1st',
	'gl-1erd': '1erd',
	'gl-tlea': 'tlea',
	'gl-t': 'term',
	'gl-tled': 'tled',
	'6eme': '6',
	'5eme': '5',
	'4eme': '4',
	'3eme': '3',
	'2nda': '2nda',
	'2ndc': '2ndc',
	'seconde a': '2nda',
	'seconde c': '2ndc',
	'1ere': '1st',
	'1era': '1era',
	'1erc': '1erc',
	'1erd': '1erd',
	'premiere a': '1era',
	'premiere c': '1erc',
	'premiere d': '1erd',
	'terminale': 'term',
	'tlea': 'tlea',
	'tlec': 'tlec',
	'tled': 'tled',
	'terminale a': 'tlea',
	'terminale c': 'tlec',
	'terminale d': 'tled',
};

/** Collège years collapse to demo `gl-*` keys. Lycée series stay on their own prefixes (`2nda`, `1erc`, …). */
const CANONICAL_GRADE_TO_GL: Record<string, string> = {
	'6eme': 'gl-6',
	'5eme': 'gl-5',
	'4eme': 'gl-4',
	'3eme': 'gl-3',
};

function resolveFromCanonical(canonical: string): string | undefined {
	if (Object.hasOwn(CANONICAL_GRADE_TO_GL, canonical)) {
		return CANONICAL_GRADE_TO_GL[canonical];
	}
	if (Object.hasOwn(GRADE_LEVEL_CLASS_ID_PREFIX, canonical)) {
		return canonical;
	}
	return undefined;
}

function parseFixtureTemplateGradeLevelId(gradeLevelId: string): string | undefined {
	const separatorIndex = gradeLevelId.indexOf(':');
	if (separatorIndex <= 0) {
		return undefined;
	}
	const templateId = gradeLevelId.slice(0, separatorIndex);
	const levelCode = gradeLevelId.slice(separatorIndex + 1);
	if (!templateId.startsWith('ci-') || !levelCode) {
		return undefined;
	}
	const canonical = normalizeGradeLevelImportKey(levelCode);
	if (Object.hasOwn(GRADE_LEVEL_CLASS_ID_PREFIX, canonical)) {
		return canonical;
	}
	return resolveFromCanonical(canonical);
}

/**
 * Class id prefixes use `gl-6` / fixture codes, not the entity uuid, when the level is a standard CI collège/lycée year.
 */
export function resolveGradeLevelKeyForClassId(
	gradeLevelId: string,
	gradeLevelName?: string,
): string {
	if (Object.hasOwn(GRADE_LEVEL_CLASS_ID_PREFIX, gradeLevelId)) {
		return gradeLevelId;
	}

	const fromTemplateId = parseFixtureTemplateGradeLevelId(gradeLevelId);
	if (fromTemplateId) {
		return fromTemplateId;
	}

	if (gradeLevelName) {
		const mapped = resolveFromCanonical(normalizeGradeLevelImportKey(gradeLevelName));
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
