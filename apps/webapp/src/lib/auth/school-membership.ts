import type { AuthorizationProfile, StaffSchoolMembership } from '$lib/auth/types';
import { readPreference, writePreference } from '$lib/preferences/storage';

export const SCHOOL_ID_STORAGE_PREFIX = 'edaya:schoolId:';

export function staffMembershipsFromProfiles(
	profiles: readonly AuthorizationProfile[] | null | undefined,
): StaffSchoolMembership[] {
	return (profiles ?? []).filter((profile): profile is StaffSchoolMembership => profile.kind === 'staff');
}

export function schoolIdStorageKey(authUserId: string): string {
	return `${SCHOOL_ID_STORAGE_PREFIX}${authUserId}`;
}

export function readPersistedSchoolId(authUserId: string | null | undefined): string | null {
	if (!authUserId) {
		return null;
	}
	return readPreference('session', schoolIdStorageKey(authUserId));
}

export function persistSelectedSchoolId(authUserId: string | null | undefined, schoolId: string): void {
	if (!authUserId || !schoolId) {
		return;
	}
	writePreference('session', schoolIdStorageKey(authUserId), schoolId);
}

export function pickStaffMembership(
	memberships: readonly StaffSchoolMembership[],
	authUserId: string | null | undefined,
): StaffSchoolMembership | null {
	if (memberships.length === 0) {
		return null;
	}

	const storedSchoolId = readPersistedSchoolId(authUserId);
	const restored = storedSchoolId
		? memberships.find(membership => membership.schoolId === storedSchoolId)
		: undefined;
	if (restored) {
		return restored;
	}

	if (memberships.length === 1) {
		return memberships[0] ?? null;
	}

	return [...memberships].sort((left, right) => left.actorId.localeCompare(right.actorId))[0] ?? null;
}
