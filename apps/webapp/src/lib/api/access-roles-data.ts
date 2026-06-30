import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { StaffRole } from '$lib/types/school';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type AccessRoleRaw = components['schemas']['AccessRole'];

export type Crud = 'C' | 'R' | 'U' | 'D';
export type PermissionScope = 'global' | 'class' | 'subject';

export interface PermissionCatalogEntry {
	key: string;
	category: string;
	label: string;
	description: string;
	scopes: PermissionScope[];
	scopedNotes?: Partial<Record<StaffRole, string>>;
}

export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
	{
		key: 'grades.edit',
		category: 'Pédagogie',
		label: 'Saisir / modifier les notes',
		description: 'Création et édition des évaluations et notes académiques.',
		scopes: ['class', 'subject'],
		scopedNotes: {
			prof_principal: 'Classe attitrée + matières',
			professeur: 'Classes & matières assignées',
		},
	},
	{
		key: 'grades.view',
		category: 'Pédagogie',
		label: 'Consulter les notes & moyennes',
		description: 'Lecture des notes et moyennes pour suivi pédagogique.',
		scopes: ['global', 'class', 'subject'],
	},
	{
		key: 'reports.edit',
		category: 'Pédagogie',
		label: 'Bulletins & orientation',
		description: 'Édition des bulletins et décisions d\'orientation.',
		scopes: ['global', 'class'],
		scopedNotes: { prof_principal: 'Classe attitrée uniquement' },
	},
	{
		key: 'records.edit',
		category: 'Dossiers',
		label: 'Dossiers élèves',
		description: 'Lecture / écriture des dossiers administratifs et pédagogiques.',
		scopes: ['global', 'class'],
		scopedNotes: { prof_principal: 'Classe attitrée' },
	},
	{
		key: 'life.absences',
		category: 'Vie scolaire',
		label: 'Absences',
		description: 'Saisie et suivi des absences.',
		scopes: ['global', 'class'],
		scopedNotes: { professeur: 'Pour ses cours' },
	},
	{
		key: 'life.tardiness',
		category: 'Vie scolaire',
		label: 'Retards',
		description: 'Enregistrement des retards.',
		scopes: ['global', 'class'],
		scopedNotes: { professeur: 'Pour ses cours' },
	},
	{
		key: 'life.discipline',
		category: 'Vie scolaire',
		label: 'Discipline & incidents',
		description: 'Création et suivi des incidents disciplinaires.',
		scopes: ['global', 'class'],
	},
	{
		key: 'staff.manage',
		category: 'Administration',
		label: 'Gestion du personnel',
		description: 'Ajout, retrait et affectation du personnel.',
		scopes: ['global'],
	},
	{
		key: 'finance.manage',
		category: 'Administration',
		label: 'Finance & facturation',
		description: 'Frais, facturation et paiements.',
		scopes: ['global'],
	},
	{
		key: 'config.school',
		category: 'Administration',
		label: 'Configuration de l\'école',
		description: 'Matières, ressources, calendrier et paramètres.',
		scopes: ['global'],
	},
];

export const ACCESS_ROLE_ID_TO_STAFF_ROLE: Record<string, StaffRole> = {
	'role-director': 'directeur',
	'role-coordinator': 'prof_principal',
	'role-teacher': 'professeur',
	'role-educator': 'educateur',
};

export const STAFF_ROLE_TO_ACCESS_ROLE_ID: Record<StaffRole, string> = {
	owner: 'role-director',
	directeur: 'role-director',
	prof_principal: 'role-coordinator',
	professeur: 'role-teacher',
	educateur: 'role-educator',
};

const UI_PERMISSION_API_RULES: Record<string, Partial<Record<Crud, string[]>>> = {
	'grades.edit': {
		C: ['GRADE_INPUT'],
		R: ['GRADE_READ'],
		U: ['GRADE_INPUT', 'GRADE_UPDATE'],
		D: ['GRADE_LOCK'],
	},
	'grades.view': {
		R: ['GRADE_READ', 'QUERY_REPORT_CARD_DETAIL_READ'],
	},
	'reports.edit': {
		C: ['REPORT_CARD_GENERATE'],
		R: ['REPORT_CARD_READ', 'QUERY_REPORT_CARD_DETAIL_READ'],
		U: ['REPORT_CARD_CONFIGURE', 'REPORT_CARD_PUBLISH', 'REPORT_CARD_GENERATE'],
		D: ['REPORT_CARD_LOCK'],
	},
	'records.edit': {
		C: ['CLASS_LOGBOOK_CREATE', 'STUDENT_CREATE'],
		R: ['STUDENT_READ', 'QUERY_STUDENT_DETAIL_READ', 'CLASS_LOGBOOK_READ'],
		U: ['STUDENT_UPDATE', 'CLASS_LOGBOOK_UPDATE', 'STUDENT_HEALTH_UPDATE'],
		D: ['STUDENT_ARCHIVE'],
	},
	'life.absences': {
		C: ['ATTENDANCE_RECORD'],
		R: ['ATTENDANCE_READ', 'QUERY_ATTENDANCE_READ'],
		U: ['ATTENDANCE_UPDATE', 'ATTENDANCE_JUSTIFY'],
		D: ['ATTENDANCE_VALIDATE'],
	},
	'life.tardiness': {
		C: ['ATTENDANCE_RECORD'],
		R: ['ATTENDANCE_READ', 'QUERY_ATTENDANCE_READ'],
		U: ['ATTENDANCE_UPDATE'],
	},
	'life.discipline': {
		C: ['DISCIPLINE_CREATE'],
		R: ['DISCIPLINE_READ'],
		U: ['DISCIPLINE_UPDATE', 'DISCIPLINE_VALIDATE'],
		D: ['DISCIPLINE_ARCHIVE'],
	},
	'staff.manage': {
		C: ['STAFF_CREATE', 'ACCESS_CONTROL_ASSIGN'],
		R: ['STAFF_READ', 'ACCESS_CONTROL_READ'],
		U: ['STAFF_UPDATE', 'ACCESS_CONTROL_CONFIGURE'],
		D: ['STAFF_ARCHIVE'],
	},
	'finance.manage': {
		C: ['PAYMENT_RECORD'],
		R: ['FINANCIAL_CONFIG_READ', 'PAYMENT_READ', 'QUERY_OVERDUE_FEES_READ'],
		U: ['FINANCIAL_CONFIG_UPDATE', 'FINANCIAL_CONFIG_CONFIGURE'],
		D: ['PAYMENT_CANCEL'],
	},
	'config.school': {
		C: ['ACADEMIC_PROGRAM_CREATE', 'TIMETABLE_CREATE', 'RESOURCE_CONFIGURE'],
		R: ['SCHOOL_STRUCTURE_READ', 'ACADEMIC_PROGRAM_READ', 'TIMETABLE_READ', 'RESOURCE_READ'],
		U: ['SCHOOL_STRUCTURE_CONFIGURE', 'EXAM_CONFIG_CONFIGURE', 'TIMETABLE_UPDATE', 'ACADEMIC_PROGRAM_UPDATE'],
		D: ['ACADEMIC_PROGRAM_DELETE'],
	},
};

function hasAnyPermission(granted: Set<string>, candidates: string[] | undefined): boolean {
	if (!candidates || candidates.length === 0) {
		return false;
	}
	return candidates.some(permission => granted.has(permission));
}

export function emptyCrudMatrix(): Record<string, Record<Crud, boolean>> {
	return Object.fromEntries(
		PERMISSION_CATALOG.map(permission => [
			permission.key,
			{ C: false, R: false, U: false, D: false },
		]),
	);
}

const CRUD_OPS: Crud[] = ['C', 'R', 'U', 'D'];

export function buildPermissionsFromCrudMatrix(
	matrix: Record<string, Record<Crud, boolean>>,
): string[] {
	const granted = new Set<string>();

	for (const permission of PERMISSION_CATALOG) {
		const rules = UI_PERMISSION_API_RULES[permission.key] ?? {};
		for (const op of CRUD_OPS) {
			if (!matrix[permission.key]?.[op]) {
				continue;
			}
			for (const apiPermission of rules[op] ?? []) {
				granted.add(apiPermission);
			}
		}
	}

	return [...granted];
}

export function buildRoleCrudMatrix(permissions: readonly string[]): Record<string, Record<Crud, boolean>> {
	const granted = new Set(permissions);
	const matrix: Record<string, Record<Crud, boolean>> = {};

	for (const permission of PERMISSION_CATALOG) {
		const rules = UI_PERMISSION_API_RULES[permission.key] ?? {};
		matrix[permission.key] = {
			C: hasAnyPermission(granted, rules.C),
			R: hasAnyPermission(granted, rules.R),
			U: hasAnyPermission(granted, rules.U),
			D: hasAnyPermission(granted, rules.D),
		};
	}

	return matrix;
}

export function buildRoleEnabledPermissions(permissions: readonly string[]): Record<string, boolean> {
	const crudMatrix = buildRoleCrudMatrix(permissions);
	return Object.fromEntries(
		PERMISSION_CATALOG.map(permission => [
			permission.key,
			Object.values(crudMatrix[permission.key] ?? {}).some(Boolean),
		]),
	);
}

export function mapAccessRolesToStaffRoles(
	accessRolesRaw: AccessRoleRaw[],
): Partial<Record<StaffRole, AccessRoleRaw>> {
	const mapped: Partial<Record<StaffRole, AccessRoleRaw>> = {};

	for (const role of accessRolesRaw) {
		const staffRole = ACCESS_ROLE_ID_TO_STAFF_ROLE[role.id];
		if (staffRole) {
			mapped[staffRole] = role;
		}
	}

	return mapped;
}

export async function loadAccessRolesData(client: SchoolClient, schoolId: string): Promise<{
	accessRoles: AccessRoleRaw[];
	roleCrudMatrix: Partial<Record<StaffRole, Record<string, Record<Crud, boolean>>>>;
	roleEnabledPermissions: Partial<Record<StaffRole, Record<string, boolean>>>;
}> {
	const accessRoles = await client.entities.accessRoles.list({ schoolId });

	const roleCrudMatrix: Partial<Record<StaffRole, Record<string, Record<Crud, boolean>>>> = {};
	const roleEnabledPermissions: Partial<Record<StaffRole, Record<string, boolean>>> = {};

	for (const [accessRoleId, staffRole] of Object.entries(ACCESS_ROLE_ID_TO_STAFF_ROLE)) {
		const role = accessRoles?.find(entry => entry.id === accessRoleId);
		if (!role) {
			continue;
		}
		roleCrudMatrix[staffRole] = buildRoleCrudMatrix(role.permissions);
		roleEnabledPermissions[staffRole] = buildRoleEnabledPermissions(role.permissions);
	}

	return {
		accessRoles: accessRoles ?? [],
		roleCrudMatrix,
		roleEnabledPermissions,
	};
}
