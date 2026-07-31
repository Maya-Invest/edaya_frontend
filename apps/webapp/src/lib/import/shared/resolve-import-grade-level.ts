import { normalizeGradeLevelImportKey } from './normalize-grade-level-import-key';

export interface ImportGradeLevelOption {
	id: string;
	name: string;
}

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
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

export function buildImportGradeLevelLookup(
	gradeLevels: readonly ImportGradeLevelOption[],
): Map<string, ImportGradeLevelOption[]> {
	const lookup = new Map<string, ImportGradeLevelOption[]>();
	for (const gradeLevel of gradeLevels) {
		registerLookupKey(lookup, normalizeLookupValue(gradeLevel.name), gradeLevel);
		registerLookupKey(lookup, normalizeGradeLevelImportKey(gradeLevel.name), gradeLevel);
	}
	return lookup;
}

export function resolveImportGradeLevel(
	levelName: string,
	lookup: Map<string, ImportGradeLevelOption[]>,
	allGradeLevels: readonly ImportGradeLevelOption[],
): { gradeLevelId?: string; suggestions?: string[] } {
	const rawKey = normalizeLookupValue(levelName);
	const canonicalKey = normalizeGradeLevelImportKey(levelName);
	if (!rawKey && !canonicalKey) {
		return { suggestions: allGradeLevels.slice(0, 5).map(entry => entry.name) };
	}

	const matches = new Map<string, ImportGradeLevelOption>();
	for (const key of [rawKey, canonicalKey]) {
		for (const entry of lookup.get(key) ?? []) {
			matches.set(entry.id, entry);
		}
	}
	const matchList = [...matches.values()];
	if (matchList.length === 1) {
		return { gradeLevelId: matchList[0]?.id };
	}

	const suggestions = allGradeLevels
		.map(entry => entry.name)
		.filter((name) => {
			const normalized = normalizeLookupValue(name);
			const canonical = normalizeGradeLevelImportKey(name);
			return normalized.includes(rawKey)
				|| rawKey.includes(normalized)
				|| canonical.includes(canonicalKey)
				|| canonicalKey.includes(canonical);
		})
		.slice(0, 5);

	return {
		suggestions: suggestions.length > 0 ? suggestions : allGradeLevels.slice(0, 5).map(entry => entry.name),
	};
}
