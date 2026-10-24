import {
	isKnownModalForPathname,
	ROUTE_MODAL_CATALOG,
} from '$lib/modal/route-modal-catalog';
import { describe, expect, it } from 'bun:test';

const STUDENT_DETAIL_MODALS = [
	'create',
	'edit-profile', 'edit-annual-profile', 'remove-annual-profile', 'guardian-relationship', 'enrollment-progression',
	'edit-health',
	'change-class',
	'link-guardian',
	'note',
	'edit-note',
	'add-absence',
	'add-incident',
] as const;

const routeCases = [
	['school-messages-detail', '/school/messages/thread', ['reply']],
	['authenticated-app', '/dashboard', ['account-profile']],
	['school-students-list', '/school/students', ['create']],
	['school-students-detail', '/school/students/student-1/grades', [...STUDENT_DETAIL_MODALS, 'generate-document', 'void-document', 'annual-report-card']],
	['class-students-list', '/classes/class-1/students', ['create']],
	['class-students-detail', '/classes/class-1/students/student-1/profile', [...STUDENT_DETAIL_MODALS, 'generate-document', 'void-document', 'annual-report-card']],
	['school-guardians-list', '/school/guardians', ['create']],
	['school-guardians-detail', '/school/guardians/guardian-1', ['create', 'edit-profile', 'guardian-relationship', 'delete']],
	['school-staff-list', '/school/staff', ['create']],
	['school-staff-detail', '/school/staff/staff-1/profile', ['create', 'edit-profile', 'delete']],
	['school-staff-permissions', '/school/staff/staff-1/permissions', ['add-permission', 'delete-permission', 'apply-profile', 'remove-profile', 'default-scopes']],
	['school-teachers-list', '/school/teachers', ['create']],
	[
		'school-teachers-detail',
		'/school/teachers/teacher-1/availability',
		[
			'create',
			'edit-profile', 'edit-annual-profile', 'remove-annual-profile',
			'delete',
			'add-unavailability',
			'edit-unavailability',
			'delete-unavailability',
			'form',
			'delete-assignment',
			'generate-document',
			'void-document',
		],
	],
	['school-teachers-assignments', '/school/teachers/teacher-1/assignments', ['form', 'delete-assignment']],
	['school-activities-list', '/school/activities', ['create']],
	[
		'school-activities-detail',
		'/school/activities/activity-1/students',
		[
			'create',
			'edit',
			'delete',
			'link-classes',
			'unlink-class',
			'add-students',
			'remove-enrollment',
		],
	],
	['school-announcements-list', '/school/announcements', ['create']],
	[
		'school-announcements-detail',
		'/school/announcements/announcement-1',
		['create', 'edit', 'add-target', 'publish', 'delete'],
	],
	['school-family-feedback-list', '/school/family-feedback', ['create']],
	[
		'school-family-feedback-detail',
		'/school/family-feedback/campaign-1/setup',
		[
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
	],
	['school-events-list', '/school/events', ['create']],
	['school-events-detail', '/school/events/incident-1', ['create', 'edit', 'resolve', 'delete']],
	['school-calendar', '/school/calendar', ['create', 'edit', 'delete']],
	[
		'class-timetable',
		'/classes/class-1/timetable/session-1/attendance',
		[
			'new-session',
			'create-schedule',
			'attendance',
			'reschedule',
			'edit-event',
			'cancel',
			'session-attendance', 'attendance-review',
			'session-logbook',
		],
	],
	['class-evaluations-list', '/classes/class-1/evaluations', ['create']],
	[
		'class-evaluations-detail',
		'/classes/class-1/evaluations/evaluation-1/grading',
		['edit', 'delete', 'attach', 'grade-entry'],
	],
	[
		'class-teaching-detail',
		'/classes/class-1/teaching/subject-1/logbook',
		['edit-subject', 'delete'],
	],
	[
		'class-teaching-progression',
		'/classes/class-1/teaching/subject-1/progression',
		['add-chapter', 'edit-chapter', 'delete-chapter'],
	],
	['class-attendance-detail', '/classes/class-1/attendance/day-1', ['record-attendance', 'attendance-review']],
	['configuration-school', '/configuration/school', ['identity', 'issuing', 'location', 'assets', 'timetable-settings']],
	[
		'configuration-academic',
		'/configuration/academic',
		[
			'create',
			'archive-year',
			'publish-year',
			'publish-period',
		],
	],
	[
		'configuration-period-grid',
		'/configuration/period-grid',
		[
			'period-def',
			'period-def-wizard',
			'delete-period-def',
		],
	],
	['configuration-structure-levels', '/configuration/structure/subjects', ['create-level', 'edit-level', 'delete-level', 'level-grading']],
	['configuration-classes-list', '/configuration/structure/classes', ['create']],
	[
		'configuration-classes-detail',
		'/configuration/structure/classes/class-1/profile',
		['create', 'edit'],
	],
	[
		'configuration-classes-assignments',
		'/configuration/structure/classes/class-1/assignments',
		['form', 'delete-assignment'],
	],
	['configuration-subjects-list', '/configuration/structure/subjects', ['create-subject']],
	[
		'configuration-subjects-detail',
		'/configuration/structure/subjects/subject-1/logbook',
		['create-subject', 'edit-subject', 'delete'],
	],
	[
		'configuration-subjects-progression',
		'/configuration/structure/subjects/subject-1/progression',
		['add-chapter', 'edit-chapter', 'delete-chapter'],
	],
	['configuration-report-cards-list', '/configuration/structure/details', ['create']],
	[
		'configuration-report-cards-detail',
		'/configuration/structure/details/report-cards/report-card-1',
		['create', 'delete', 'edit', 'add-section', 'edit-section', 'delete-section'],
	],
	['configuration-grade-scales', '/configuration/grade-scales', ['create', 'edit', 'delete', 'add-interval', 'edit-interval', 'delete-interval']],
	['configuration-notifications-list', '/configuration/notifications', ['reset-all']],
	[
		'configuration-notifications-detail',
		'/configuration/notifications/report_card.published',
		['edit', 'reset-key', 'reset-all'],
	],
	['configuration-discipline', '/configuration/other/discipline', ['create', 'edit', 'delete']],
	['configuration-subject-categories', '/configuration/other/subject-categories', ['create', 'edit', 'delete']],
	['configuration-permission-profiles', '/configuration/permission-profiles', ['create', 'edit', 'delete']],
	[
		'configuration-tools',
		'/configuration/tools',
		['import', 'generate-timetable'],
	],
	[
		'configuration-teacher-assignments',
		'/configuration/tools/teacher-assignments',
		['create'],
	],
	['finance-fees', '/finance/fees', ['create', 'edit', 'archive', 'activate']],
	['finance-fee-detail', '/finance/fees/fee-1', ['edit', 'archive', 'activate', 'assign-fee']],
	['finance-billing-list', '/finance/billing', ['assign-fee']],
	['finance-billing-detail', '/finance/billing/billing-1', ['assign-fee', 'payment', 'allocate', 'unallocate', 'waive', 'adjust', 'cancel']],
	['finance-payments', '/finance/payment', ['payment', 'reverse', 'refund']],
] as const;

describe('route modal catalog', () => {
	it('retains billing actions on payment and history tabs', () => {
		for (const tab of ['payments', 'history']) {
			for (const action of ['payment', 'allocate', 'unallocate', 'waive', 'adjust', 'cancel'])
				expect(isKnownModalForPathname(`/finance/billing/charge-1/${tab}`, action)).toBeTrue();
		}
	});
	it('matches permission profile detail URLs to the existing modal family', () => {
		const family = ROUTE_MODAL_CATALOG.find(entry => entry.routeFamily === 'configuration-permission-profiles');
		expect(family?.pathnamePattern.test('/configuration/permission-profiles/profile-1')).toBe(true);
		expect(family?.modalNames).toEqual(['create', 'edit', 'delete']);
	});

	it('enumerates every audited route family and modal name', () => {
		expect(ROUTE_MODAL_CATALOG.map(entry => entry.routeFamily)).toEqual(
			routeCases.map(([routeFamily]) => routeFamily),
		);

		for (const [routeFamily, pathname, modalNames] of routeCases) {
			const entry = ROUTE_MODAL_CATALOG.find(candidate => candidate.routeFamily === routeFamily);
			expect(entry).toBeDefined();
			expect(entry?.modalNames).toEqual(modalNames);
			for (const modalName of modalNames) {
				expect(isKnownModalForPathname(pathname, modalName)).toBeTrue();
			}
			expect(isKnownModalForPathname(pathname, 'representative-invalid-modal')).toBeFalse();
		}
	});

	it('recognizes account profile throughout authenticated app routes', () => {
		for (const pathname of [
			'/dashboard',
			'/account/inbox/message-1',
			'/classes/class-1/students',
			'/configuration/tools',
			'/finance/billing/billing-1',
			'/school/students/student-1/profile',
		]) {
			expect(isKnownModalForPathname(pathname, 'account-profile')).toBeTrue();
		}
	});

	it('does not expose a student grades editor modal', () => {
		expect(isKnownModalForPathname('/school/students/student-1/grades', 'add-grade')).toBeFalse();
		expect(isKnownModalForPathname('/classes/class-1/students/student-1/grades', 'add-grade')).toBeFalse();
	});

	it('does not expose route-local names to sibling routes', () => {
		expect(isKnownModalForPathname('/school/students', 'edit-profile')).toBeFalse();
		expect(isKnownModalForPathname('/configuration/tools', 'new-session')).toBeFalse();
		expect(isKnownModalForPathname('/classes/class-1/timetable', 'create')).toBeFalse();
		expect(isKnownModalForPathname('/finance/fees', 'payment')).toBeFalse();
		expect(isKnownModalForPathname('/school/staff/staff-1/profile', 'add-permission')).toBeFalse();
	});

	it('rejects missing names and public route names', () => {
		expect(isKnownModalForPathname('/school/students', null)).toBeFalse();
		expect(isKnownModalForPathname('/school/students', '')).toBeFalse();
		expect(isKnownModalForPathname('/login', 'account-profile')).toBeFalse();
		expect(isKnownModalForPathname('/invite/token', 'account-profile')).toBeFalse();
	});

	it('supports canonical direct-detail and trailing-slash paths', () => {
		expect(isKnownModalForPathname('/school/students/student-1', 'edit-profile')).toBeTrue();
		expect(isKnownModalForPathname('/configuration/structure/classes/class-1/', 'edit')).toBeTrue();
		expect(isKnownModalForPathname('/classes/class-1/timetable/session-1', 'edit-event')).toBeTrue();
	});
});
