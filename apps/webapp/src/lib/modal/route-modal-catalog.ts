import { ACCOUNT_PROFILE_MODAL } from '$lib/account/profile-url';

export interface RouteModalCatalogEntry {
	routeFamily: string;
	pathnamePattern: RegExp;
	modalNames: readonly string[];
}

const STUDENT_DETAIL_MODALS = [
	'edit-profile',
	'edit-annual-profile',
	'remove-annual-profile',
	'guardian-relationship',
	'enrollment-progression',
	'edit-health',
	'change-class',
	'link-guardian',
	'note',
	'edit-note',
	'add-absence',
	'add-incident',
] as const;

const TIMETABLE_MODALS = [
	'new-session',
	'create-schedule',
	'attendance',
	'reschedule',
	'edit-event',
	'cancel',
	'session-attendance',
	'attendance-review',
	'session-logbook',
] as const;

/**
 * Canonical route-level ownership for URL modal names.
 *
 * Entries describe every modal manager that can be mounted for a pathname. A
 * feature manager still owns permission, target, step, tab, and other
 * route-local validation for names recognized here.
 */
export const ROUTE_MODAL_CATALOG = [
	{ routeFamily: 'school-messages-detail', pathnamePattern: /^\/school\/messages\/[^/]+\/?$/, modalNames: ['reply'] },
	{
		routeFamily: 'authenticated-app',
		pathnamePattern:
			/^\/(?:dashboard\/?$|(?:account|classes|configuration|finance|school)(?:\/|$))/,
		modalNames: [ACCOUNT_PROFILE_MODAL],
	},
	{
		routeFamily: 'school-students-list',
		pathnamePattern: /^\/school\/students\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'school-students-detail',
		pathnamePattern:
			/^\/school\/students\/[^/]+(?:\/(?:profile|grades|attendance|incidents|finances|report-card|enrollments|documents))?\/?$/,
		modalNames: ['create', ...STUDENT_DETAIL_MODALS, 'generate-document', 'void-document', 'annual-report-card'],
	},
	{
		routeFamily: 'class-students-list',
		pathnamePattern: /^\/classes\/[^/]+\/students\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'class-students-detail',
		pathnamePattern:
			/^\/classes\/[^/]+\/students\/[^/]+(?:\/(?:profile|grades|attendance|incidents|finances|report-card|enrollments|documents))?\/?$/,
		modalNames: ['create', ...STUDENT_DETAIL_MODALS, 'generate-document', 'void-document', 'annual-report-card'],
	},
	{
		routeFamily: 'school-guardians-list',
		pathnamePattern: /^\/school\/guardians\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'school-guardians-detail',
		pathnamePattern: /^\/school\/guardians\/[^/]+\/?$/,
		modalNames: ['create', 'edit-profile', 'guardian-relationship', 'delete'],
	},
	{
		routeFamily: 'school-staff-list',
		pathnamePattern: /^\/school\/staff\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'school-staff-detail',
		pathnamePattern:
			/^\/school\/staff\/[^/]+(?:\/(?:profile|permissions))?\/?$/,
		modalNames: ['create', 'edit-profile', 'delete'],
	},
	{
		routeFamily: 'school-staff-permissions',
		pathnamePattern: /^\/school\/staff\/[^/]+\/permissions\/?$/,
		modalNames: ['add-permission', 'delete-permission', 'apply-profile', 'remove-profile', 'default-scopes'],
	},
	{
		routeFamily: 'school-teachers-list',
		pathnamePattern: /^\/school\/teachers\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'school-teachers-detail',
		pathnamePattern:
			/^\/school\/teachers\/[^/]+(?:\/(?:profile|assignments|availability|timetable|evaluations|family-feedback|documents))?\/?$/,
		modalNames: [
			'create',
			'edit-profile',
			'edit-annual-profile',
			'remove-annual-profile',
			'delete',
			'add-unavailability',
			'edit-unavailability',
			'delete-unavailability',
			'form',
			'delete-assignment',
			'generate-document',
			'void-document',
		],
	},
	{
		routeFamily: 'school-teachers-assignments',
		pathnamePattern: /^\/school\/teachers\/[^/]+\/assignments\/?$/,
		modalNames: ['form', 'delete-assignment'],
	},
	{
		routeFamily: 'school-activities-list',
		pathnamePattern: /^\/school\/activities\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'school-activities-detail',
		pathnamePattern:
			/^\/school\/activities\/[^/]+(?:\/(?:profile|classes|students))?\/?$/,
		modalNames: [
			'create',
			'edit',
			'delete',
			'link-classes',
			'unlink-class',
			'add-students',
			'remove-enrollment',
		],
	},
	{
		routeFamily: 'school-announcements-list',
		pathnamePattern: /^\/school\/announcements\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'school-announcements-detail',
		pathnamePattern: /^\/school\/announcements\/[^/]+\/?$/,
		modalNames: ['create', 'edit', 'add-target', 'publish', 'delete'],
	},
	{
		routeFamily: 'school-family-feedback-list',
		pathnamePattern: /^\/school\/family-feedback\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'school-family-feedback-detail',
		pathnamePattern: /^\/school\/family-feedback\/[^/]+(?:\/(?:setup|audience|moderation|results))?\/?$/,
		modalNames: [
			'create',
			'edit',
			'assign-moderator',
			'schedule',
			'open',
			'close',
			'cancel',
			'theme',
			'publish',
			'archive',
		],
	},
	{
		routeFamily: 'school-events-list',
		pathnamePattern: /^\/school\/events\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'school-events-detail',
		pathnamePattern: /^\/school\/events\/[^/]+\/?$/,
		modalNames: ['create', 'edit', 'resolve', 'delete'],
	},
	{
		routeFamily: 'school-calendar',
		pathnamePattern: /^\/school\/calendar\/?$/,
		modalNames: ['create', 'edit', 'delete'],
	},
	{
		routeFamily: 'class-timetable',
		pathnamePattern:
			/^\/classes\/[^/]+\/timetable(?:\/[^/]+(?:\/(?:details|attendance|logbook))?)?\/?$/,
		modalNames: TIMETABLE_MODALS,
	},
	{
		routeFamily: 'class-evaluations-list',
		pathnamePattern: /^\/classes\/[^/]+\/evaluations\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'class-evaluations-detail',
		pathnamePattern:
			/^\/classes\/[^/]+\/evaluations\/[^/]+(?:\/(?:details|grading))?\/?$/,
		modalNames: ['edit', 'delete', 'attach', 'grade-entry'],
	},
	{
		routeFamily: 'class-teaching-detail',
		pathnamePattern:
			/^\/classes\/[^/]+\/teaching\/[^/]+(?:\/(?:progression|logbook))?\/?$/,
		modalNames: ['edit-subject', 'delete'],
	},
	{
		routeFamily: 'class-teaching-progression',
		pathnamePattern: /^\/classes\/[^/]+\/teaching\/[^/]+\/progression\/?$/,
		modalNames: ['add-chapter', 'edit-chapter', 'delete-chapter'],
	},
	{
		routeFamily: 'class-attendance-detail',
		pathnamePattern: /^\/classes\/[^/]+\/attendance\/[^/]+\/?$/,
		modalNames: ['record-attendance', 'attendance-review'],
	},
	{
		routeFamily: 'configuration-school',
		pathnamePattern: /^\/configuration\/school\/?$/,
		modalNames: ['identity', 'issuing', 'location', 'assets', 'timetable-settings'],
	},
	{
		routeFamily: 'configuration-academic',
		pathnamePattern: /^\/configuration\/academic\/?$/,
		modalNames: [
			'create',
			'archive-year',
			'publish-year',
			'publish-period',
		],
	},
	{
		routeFamily: 'configuration-period-grid',
		pathnamePattern: /^\/configuration\/period-grid\/?$/,
		modalNames: [
			'period-def',
			'period-def-wizard',
			'delete-period-def',
		],
	},
	{
		routeFamily: 'configuration-structure-levels',
		pathnamePattern: /^\/configuration\/structure(?:\/|$)/,
		modalNames: ['create-level', 'edit-level', 'delete-level', 'level-grading'],
	},
	{
		routeFamily: 'configuration-classes-list',
		pathnamePattern: /^\/configuration\/structure\/classes\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'configuration-classes-detail',
		pathnamePattern:
			/^\/configuration\/structure\/classes\/[^/]+(?:\/(?:profile|assignments))?\/?$/,
		modalNames: ['create', 'edit'],
	},
	{
		routeFamily: 'configuration-classes-assignments',
		pathnamePattern: /^\/configuration\/structure\/classes\/[^/]+\/assignments\/?$/,
		modalNames: ['form', 'delete-assignment'],
	},
	{
		routeFamily: 'configuration-subjects-list',
		pathnamePattern: /^\/configuration\/structure\/subjects\/?$/,
		modalNames: ['create-subject'],
	},
	{
		routeFamily: 'configuration-subjects-detail',
		pathnamePattern:
			/^\/configuration\/structure\/subjects\/[^/]+(?:\/(?:progression|logbook))?\/?$/,
		modalNames: ['create-subject', 'edit-subject', 'delete'],
	},
	{
		routeFamily: 'configuration-subjects-progression',
		pathnamePattern: /^\/configuration\/structure\/subjects\/[^/]+\/progression\/?$/,
		modalNames: ['add-chapter', 'edit-chapter', 'delete-chapter'],
	},
	{
		routeFamily: 'configuration-report-cards-list',
		pathnamePattern: /^\/configuration\/structure\/details\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'configuration-report-cards-detail',
		pathnamePattern: /^\/configuration\/structure\/details\/report-cards\/[^/]+\/?$/,
		modalNames: ['create', 'delete', 'edit', 'add-section', 'edit-section', 'delete-section'],
	},
	{
		routeFamily: 'configuration-grade-scales',
		pathnamePattern: /^\/configuration\/grade-scales\/?$/,
		modalNames: ['create', 'edit', 'delete', 'add-interval', 'edit-interval', 'delete-interval'],
	},
	{
		routeFamily: 'configuration-notifications-list',
		pathnamePattern: /^\/configuration\/notifications\/?$/,
		modalNames: ['reset-all'],
	},
	{
		routeFamily: 'configuration-notifications-detail',
		pathnamePattern: /^\/configuration\/notifications\/[^/]+\/?$/,
		modalNames: ['edit', 'reset-key', 'reset-all'],
	},
	{
		routeFamily: 'configuration-discipline',
		pathnamePattern: /^\/configuration\/other\/discipline\/?$/,
		modalNames: ['create', 'edit', 'delete'],
	},
	{
		routeFamily: 'configuration-subject-categories',
		pathnamePattern: /^\/configuration\/other\/(?:subject-categories|academic-disciplines|placement-statuses)\/?$/,
		modalNames: ['create', 'edit', 'delete'],
	},
	{
		routeFamily: 'configuration-permission-profiles',
		pathnamePattern: /^\/configuration\/permission-profiles(?:\/[^/]+)?\/?$/,
		modalNames: ['create', 'edit', 'delete'],
	},
	{
		routeFamily: 'configuration-tools',
		pathnamePattern: /^\/configuration\/tools\/?$/,
		modalNames: ['import', 'generate-timetable'],
	},
	{
		routeFamily: 'configuration-teacher-assignments',
		pathnamePattern: /^\/configuration\/tools\/teacher-assignments\/?$/,
		modalNames: ['create'],
	},
	{
		routeFamily: 'finance-fees',
		pathnamePattern: /^\/finance\/fees\/?$/,
		modalNames: ['create', 'edit', 'archive', 'activate'],
	},
	{
		routeFamily: 'finance-fee-detail',
		pathnamePattern: /^\/finance\/fees\/[^/]+\/?$/,
		modalNames: ['edit', 'archive', 'activate', 'assign-fee'],
	},
	{
		routeFamily: 'finance-billing-list',
		pathnamePattern: /^\/finance\/billing\/?$/,
		modalNames: ['assign-fee'],
	},
	{
		routeFamily: 'finance-billing-detail',
		pathnamePattern: /^\/finance\/billing\/[^/]+(?:\/(?:payments|history))?\/?$/,
		modalNames: ['assign-fee', 'payment', 'allocate', 'unallocate', 'waive', 'adjust', 'cancel'],
	},
	{
		routeFamily: 'finance-payments',
		pathnamePattern: /^\/finance\/payment\/?$/,
		modalNames: ['payment', 'reverse', 'refund'],
	},
] as const satisfies readonly RouteModalCatalogEntry[];

export function isKnownModalForPathname(
	pathname: string,
	rawModalName: string | null,
): boolean {
	if (!rawModalName) {
		return false;
	}
	return ROUTE_MODAL_CATALOG.some(entry =>
		entry.pathnamePattern.test(pathname)
		&& (entry.modalNames as readonly string[]).includes(rawModalName),
	);
}
