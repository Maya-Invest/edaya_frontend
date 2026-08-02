/**
 * Maps pre-v4 onboarding draft grade-level keys to API fixture grade level ids.
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

export function migrateLegacyGradeLevelId(gradeLevelId: string): string {
	if (!gradeLevelId.startsWith('gl-')) {
		return gradeLevelId;
	}
	return LEGACY_GL_TO_API_GRADE_LEVEL_ID[gradeLevelId as keyof typeof LEGACY_GL_TO_API_GRADE_LEVEL_ID]
		?? gradeLevelId;
}
