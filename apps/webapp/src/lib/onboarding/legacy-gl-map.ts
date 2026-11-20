/**
 * Thin seed-id ↔ template-id map for legacy drafts and mnemonic class ids.
 * Not Ivory Coast fixture content — display names come from the canonical dataset.
 */
export const LEGACY_GL_TO_API_GRADE_LEVEL_ID = {
	'gl-6': 'ci-college:6EME',
	'gl-5': 'ci-college:5EME',
	'gl-4': 'ci-college:4EME',
	'gl-3': 'ci-college:3EME',
	'gl-2nda': 'ci-lycee:2NDA',
	'gl-2': 'ci-lycee:2NDC',
	'gl-1era': 'ci-lycee:1ERA',
	'gl-1': 'ci-lycee:1ERC',
	'gl-1erd': 'ci-lycee:1ERD',
	'gl-tlea': 'ci-lycee:TLEA',
	'gl-t': 'ci-lycee:TLEC',
	'gl-tled': 'ci-lycee:TLED',
} as const satisfies Record<string, string>;

const API_GRADE_LEVEL_TO_SEED_ID = Object.fromEntries(
	Object.entries(LEGACY_GL_TO_API_GRADE_LEVEL_ID).map(([seedId, templateId]) => [templateId, seedId]),
) as Record<string, keyof typeof LEGACY_GL_TO_API_GRADE_LEVEL_ID>;

/** Same prefixes as backend `GRADE_LEVEL_CLASS_ID_PREFIX` (mnemonic ids only). */
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
};

export function migrateLegacyGradeLevelId(gradeLevelId: string): string {
	if (!gradeLevelId.startsWith('gl-')) {
		return gradeLevelId;
	}
	return LEGACY_GL_TO_API_GRADE_LEVEL_ID[gradeLevelId as keyof typeof LEGACY_GL_TO_API_GRADE_LEVEL_ID]
		?? gradeLevelId;
}

export function structureGradeLevelSeedId(templateOrSeedId: string): string {
	if (Object.hasOwn(GRADE_LEVEL_CLASS_ID_PREFIX, templateOrSeedId)) {
		return templateOrSeedId;
	}
	const mapped = API_GRADE_LEVEL_TO_SEED_ID[templateOrSeedId];
	if (mapped) {
		return mapped;
	}
	const separatorIndex = templateOrSeedId.indexOf(':');
	if (separatorIndex > 0) {
		const levelCode = templateOrSeedId.slice(separatorIndex + 1);
		if (levelCode) {
			return `gl-${levelCode.toLowerCase()}`;
		}
	}
	return templateOrSeedId;
}
