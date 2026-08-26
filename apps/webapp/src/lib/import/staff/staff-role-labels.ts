import type { StaffProfileRole } from '$lib/staff/staff-profile-roles';

/** Known staff role labels for import validation (FR + EN, normalized lowercase). */
export const STAFF_IMPORT_ROLE_LABELS = [
	'secrétaire',
	'secretary',
	'directeur adjoint',
	'deputy director',
	'directeur des études',
	'director of studies',
	'cpe / vie scolaire',
	'pastoral / student life',
	'cpe',
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
	'comptable',
	'accountant',
	'informaticien',
	'it administrator',
	'it admin',
] as const;

const TEACHER_IMPORT_LABELS = new Set([
	'enseignant portail (app enseignant)',
	'portal teacher (teacher app)',
	'professeur',
	'teacher',
	'professeur principal',
	'lead teacher',
]);

const PROFILE_ROLE_IMPORT_LABELS: readonly { role: StaffProfileRole; labels: readonly string[] }[] = [
	{ role: 'deputy_director', labels: ['directeur adjoint', 'deputy director'] },
	{ role: 'studies_director', labels: ['directeur des études', 'director of studies'] },
	{ role: 'cpe', labels: ['cpe / vie scolaire', 'pastoral / student life', 'cpe'] },
	{ role: 'secretary', labels: ['secrétaire', 'secretary'] },
	{ role: 'accountant', labels: ['comptable', 'accountant'] },
	{ role: 'it_admin', labels: ['informaticien', 'it administrator', 'it admin'] },
	{ role: 'directeur', labels: ['directeur', 'principal', 'administrator'] },
	{ role: 'educateur', labels: ['éducateur', 'educator'] },
];

export function normalizeStaffRoleLabel(value: string): string {
	return value.trim().toLowerCase();
}

export function isKnownStaffImportRole(value: string): boolean {
	const normalized = normalizeStaffRoleLabel(value);
	return STAFF_IMPORT_ROLE_LABELS.some(
		label => label === normalized || normalized.includes(label) || label.includes(normalized),
	);
}

export function mapStaffImportRoleToProfileRole(value: string): StaffProfileRole | undefined {
	const normalized = normalizeStaffRoleLabel(value);
	if (
		TEACHER_IMPORT_LABELS.has(normalized)
		|| [...TEACHER_IMPORT_LABELS].some(label => normalized.includes(label))
	) {
		return undefined;
	}

	for (const entry of PROFILE_ROLE_IMPORT_LABELS) {
		if (entry.labels.some(label => normalized === label)) {
			return entry.role;
		}
	}

	for (const entry of PROFILE_ROLE_IMPORT_LABELS) {
		if (entry.labels.some(label => normalized.includes(label))) {
			return entry.role;
		}
	}

	return undefined;
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
