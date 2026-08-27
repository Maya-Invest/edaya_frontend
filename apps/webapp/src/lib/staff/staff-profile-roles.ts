export type StaffProfileRole
	= | 'directeur'
		| 'deputy_director'
		| 'studies_director'
		| 'educateur'
		| 'cpe'
		| 'secretary'
		| 'accountant'
		| 'it_admin';

export const STAFF_PROFILE_ROLES = [
	'directeur',
	'deputy_director',
	'studies_director',
	'educateur',
	'cpe',
	'secretary',
	'accountant',
	'it_admin',
] as const satisfies readonly StaffProfileRole[];

export const DEFAULT_STAFF_PROFILE_ROLE: StaffProfileRole = 'secretary';

export const SELECTABLE_STAFF_PROFILE_ROLES: readonly {
	value: StaffProfileRole;
	labelKey: `staff.role.${StaffProfileRole}`;
}[] = STAFF_PROFILE_ROLES.map(value => ({
	value,
	labelKey: `staff.role.${value}` as const,
}));

export function isStaffProfileRole(value: string | null | undefined): value is StaffProfileRole {
	return Boolean(value && (STAFF_PROFILE_ROLES as readonly string[]).includes(value));
}

/** Live API field; published `@maya-invest/edaya-api-client` may lag the backend OpenAPI. */
export type StaffMemberProfileRolePatch = {
	profileRole?: StaffProfileRole | null;
};
