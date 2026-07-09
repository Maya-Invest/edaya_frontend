import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import { guardianLinksForGuardians } from '$lib/api/entity-list-filters';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type GuardianRaw = components['schemas']['Guardian'];
type GuardianLinkRaw = components['schemas']['GuardianStudentLink'];
type StaffRaw = components['schemas']['StaffMember'];

export interface GuardianNotificationSettings {
	id: string;
	name: string;
	initials: string;
	subjectId: string | null;
	hasAccess: boolean;
	notificationEmail: string | null;
	notificationPhone: string | null;
	contactMethods: GuardianRaw['contactMethods'];
	links: GuardianLinkRaw[];
}

export interface StaffNotificationSettings {
	subjectId: string | null;
	email: string;
	notificationEmail: string | null;
	notificationPhone: string | null;
}

function guardianInitials(firstName: string, lastName: string): string {
	return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
}

export async function fetchGuardianNotificationSettings(
	client: SchoolClient,
	guardianId: string,
): Promise<GuardianNotificationSettings | null> {
	const guardian = await client.entities.guardians.get(guardianId);
	const links = await client.entities.guardianLinks.list(
		guardianLinksForGuardians([guardianId]),
	);
	return {
		id: guardian.id,
		name: `${guardian.firstName} ${guardian.lastName}`,
		initials: guardianInitials(guardian.firstName, guardian.lastName),
		subjectId: guardian.subjectId ?? null,
		hasAccess: guardian.hasAccess ?? true,
		notificationEmail: guardian.notificationEmail ?? null,
		notificationPhone: guardian.notificationPhone ?? null,
		contactMethods: guardian.contactMethods ?? [],
		links: links ?? [],
	};
}

export async function fetchStaffSubjectId(
	client: SchoolClient,
	staffId: string,
): Promise<StaffNotificationSettings> {
	const staff: StaffRaw = await client.entities.staffMembers.get(staffId);
	return {
		subjectId: staff.subjectId ?? null,
		email: staff.email ?? '',
		notificationEmail: staff.notificationEmail ?? null,
		notificationPhone: staff.notificationPhone ?? null,
	};
}
