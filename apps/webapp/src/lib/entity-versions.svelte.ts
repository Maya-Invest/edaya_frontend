export const ENTITY_VERSION_KEYS = [
	'students',
	'guardians',
	'staff',
	'teachers',
	'incidents',
	'activities',
	'announcements',
	'evaluations',
	'attendance',
	'enrollments',
	'reportCards',
	'planning',
	'subjects',
	'billing',
	'fees',
	'payments',
	'inbox',
] as const;

export type EntityVersionKey = (typeof ENTITY_VERSION_KEYS)[number];

export class EntityVersions {
	students = $state(0);
	guardians = $state(0);
	staff = $state(0);
	teachers = $state(0);
	incidents = $state(0);
	activities = $state(0);
	announcements = $state(0);
	evaluations = $state(0);
	attendance = $state(0);
	enrollments = $state(0);
	reportCards = $state(0);
	planning = $state(0);
	subjects = $state(0);
	billing = $state(0);
	fees = $state(0);
	payments = $state(0);
	inbox = $state(0);

	bump(key: EntityVersionKey) {
		this[key]++;
	}
}

export const entityVersions = new EntityVersions();
