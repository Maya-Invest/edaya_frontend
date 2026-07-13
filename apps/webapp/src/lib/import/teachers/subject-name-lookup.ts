import type { SchoolSubjectCatalogEntry } from '$lib/import/shared/load-school-subject-names';

export function normalizeSubjectLookupName(value: string): string {
	return value.trim().toLowerCase();
}

export function isKnownSubjectName(value: string, knownNames: readonly string[]): boolean {
	const normalized = normalizeSubjectLookupName(value);
	return knownNames.some(name => normalizeSubjectLookupName(name) === normalized);
}

export function resolveSubjectCatalogId(
	value: string,
	catalog: readonly SchoolSubjectCatalogEntry[],
): string | undefined {
	const normalized = normalizeSubjectLookupName(value);
	const match = catalog.find(entry => normalizeSubjectLookupName(entry.name) === normalized);
	return match?.id;
}

export function resolvePrimarySubjectId(
	subjectNames: readonly string[],
	catalog: readonly SchoolSubjectCatalogEntry[],
): string | undefined {
	for (const subjectName of subjectNames) {
		const subjectId = resolveSubjectCatalogId(subjectName, catalog);
		if (subjectId) {
			return subjectId;
		}
	}
	return undefined;
}

export function subjectNameSuggestions(
	query: string,
	knownNames: readonly string[],
	limit = 5,
): string[] {
	const normalizedQuery = normalizeSubjectLookupName(query);
	const matches = knownNames.filter((name) => {
		const normalizedName = normalizeSubjectLookupName(name);
		return normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName);
	});

	if (matches.length > 0) {
		return [...new Set(matches)].slice(0, limit);
	}

	return knownNames.slice(0, limit);
}
