/** Known staff role labels for import validation (FR + EN, normalized lowercase). */
export const STAFF_IMPORT_ROLE_LABELS = [
	'secrétaire',
	'secretary',
	'directeur adjoint',
	'deputy director',
	'cpe / vie scolaire',
	'pastoral / student life',
	'enseignant portail (app enseignant)',
	'portal teacher (teacher app)',
	'directeur',
	'principal',
	'administrator',
	'professeur',
	'teacher',
	'professeur principal',
	'lead teacher',
	'éducateur',
	'educator',
] as const;

export function normalizeStaffRoleLabel(value: string): string {
	return value.trim().toLowerCase();
}

export function isKnownStaffImportRole(value: string): boolean {
	const normalized = normalizeStaffRoleLabel(value);
	return STAFF_IMPORT_ROLE_LABELS.some(
		label => label === normalized || normalized.includes(label) || label.includes(normalized),
	);
}

export function staffRoleSuggestions(query: string, limit = 5): string[] {
	const normalizedQuery = normalizeStaffRoleLabel(query);
	const matches = STAFF_IMPORT_ROLE_LABELS.filter(
		label => label.includes(normalizedQuery) || normalizedQuery.includes(label),
	);

	if (matches.length > 0) {
		return [...new Set(matches)].slice(0, limit);
	}

	return STAFF_IMPORT_ROLE_LABELS.slice(0, limit);
}
