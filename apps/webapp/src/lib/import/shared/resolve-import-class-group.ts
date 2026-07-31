export interface ImportClassOption {
	id: string;
	name: string;
}

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

export function buildImportClassLookup(
	classes: readonly ImportClassOption[],
): Map<string, ImportClassOption[]> {
	const lookup = new Map<string, ImportClassOption[]>();
	for (const classGroup of classes) {
		const key = normalizeLookupValue(classGroup.name);
		const bucket = lookup.get(key) ?? [];
		bucket.push(classGroup);
		lookup.set(key, bucket);
	}
	return lookup;
}

export function resolveImportClassGroup(
	className: string,
	lookup: Map<string, ImportClassOption[]>,
	allClasses: readonly ImportClassOption[],
): { classGroupId?: string; suggestions?: string[] } {
	const key = normalizeLookupValue(className);
	if (!key) {
		return { suggestions: allClasses.slice(0, 5).map(entry => entry.name) };
	}

	const matches = lookup.get(key) ?? [];
	if (matches.length === 1) {
		return { classGroupId: matches[0]?.id };
	}

	const suggestions = allClasses
		.map(entry => entry.name)
		.filter((name) => {
			const normalized = normalizeLookupValue(name);
			return normalized.includes(key) || key.includes(normalized);
		})
		.slice(0, 5);

	return {
		suggestions: suggestions.length > 0 ? suggestions : allClasses.slice(0, 5).map(entry => entry.name),
	};
}
