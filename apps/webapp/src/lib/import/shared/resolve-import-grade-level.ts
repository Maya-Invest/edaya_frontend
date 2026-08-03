export interface ImportGradeLevelOption {
	id: string;
	name: string;
}

function registerLookupKey(
	lookup: Map<string, ImportGradeLevelOption[]>,
	key: string,
	gradeLevel: ImportGradeLevelOption,
): void {
	if (!key) {
		return;
	}
	const bucket = lookup.get(key) ?? [];
	if (!bucket.some(entry => entry.id === gradeLevel.id)) {
		bucket.push(gradeLevel);
	}
	lookup.set(key, bucket);
}

/** Exact match against school grade level id / name from onboarding. */
export function buildImportGradeLevelLookup(
	gradeLevels: readonly ImportGradeLevelOption[],
): Map<string, ImportGradeLevelOption[]> {
	const lookup = new Map<string, ImportGradeLevelOption[]>();
	for (const gradeLevel of gradeLevels) {
		registerLookupKey(lookup, gradeLevel.id, gradeLevel);
		registerLookupKey(lookup, gradeLevel.name, gradeLevel);
	}
	return lookup;
}

export function resolveImportGradeLevel(
	levelName: string,
	lookup: Map<string, ImportGradeLevelOption[]>,
	allGradeLevels: readonly ImportGradeLevelOption[],
): { gradeLevelId?: string; suggestions?: string[] } {
	if (!levelName) {
		return { suggestions: allGradeLevels.slice(0, 5).map(entry => entry.name) };
	}

	const matches = lookup.get(levelName) ?? [];
	if (matches.length === 1) {
		return { gradeLevelId: matches[0]?.id };
	}

	const suggestions = allGradeLevels
		.map(entry => entry.name)
		.filter(name => name.includes(levelName) || levelName.includes(name))
		.slice(0, 5);

	return {
		suggestions: suggestions.length > 0 ? suggestions : allGradeLevels.slice(0, 5).map(entry => entry.name),
	};
}
