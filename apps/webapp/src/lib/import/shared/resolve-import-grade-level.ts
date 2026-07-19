export interface ImportGradeLevelOption {
	id: string;
	name: string;
}

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

export function buildImportGradeLevelLookup(
	gradeLevels: readonly ImportGradeLevelOption[],
): Map<string, ImportGradeLevelOption[]> {
	const lookup = new Map<string, ImportGradeLevelOption[]>();
	for (const gradeLevel of gradeLevels) {
		const key = normalizeLookupValue(gradeLevel.name);
		const bucket = lookup.get(key) ?? [];
		bucket.push(gradeLevel);
		lookup.set(key, bucket);
	}
	return lookup;
}

export function resolveImportGradeLevel(
	levelName: string,
	lookup: Map<string, ImportGradeLevelOption[]>,
	allGradeLevels: readonly ImportGradeLevelOption[],
): { gradeLevelId?: string; suggestions?: string[] } {
	const key = normalizeLookupValue(levelName);
	if (!key) {
		return { suggestions: allGradeLevels.slice(0, 5).map(entry => entry.name) };
	}

	const matches = lookup.get(key) ?? [];
	if (matches.length === 1) {
		return { gradeLevelId: matches[0]?.id };
	}

	const suggestions = allGradeLevels
		.map(entry => entry.name)
		.filter((name) => {
			const normalized = normalizeLookupValue(name);
			return normalized.includes(key) || key.includes(normalized);
		})
		.slice(0, 5);

	return {
		suggestions: suggestions.length > 0 ? suggestions : allGradeLevels.slice(0, 5).map(entry => entry.name),
	};
}
