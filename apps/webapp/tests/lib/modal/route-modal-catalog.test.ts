import { describe, expect, it } from 'bun:test';
import {
	ROUTE_MODAL_CATALOG,
	isKnownModalForPathname,
} from '$lib/modal/route-modal-catalog';

const STUDENT_DETAIL_MODALS = [
	'create',
	'edit-profile',
	'edit-health',
	'change-class',
	'link-guardian',
	'note',
	'edit-note',
	'add-absence',
	'add-incident',
	'add-grade',
] as const;

const routeCases = [
	['authenticated-app', '/dashboard', ['account-profile']],
	['school-students-list', '/school/students', ['create']],
	['school-students-detail', '/school/students/student-1/grades', [...STUDENT_DETAIL_MODALS, 'generate-document', 'void-document']],
	['class-students-list', '/classes/class-1/students', ['create']],
	['class-students-detail', '/classes/class-1/students/student-1/profile', [...STUDENT_DETAIL_MODALS, 'generate-document', 'void-document']],
	['school-guardians-list', '/school/guardians', ['create']],
	['school-guardians-detail', '/school/guardians/guardian-1', ['create', 'edit-profile', 'delete']],
	['school-staff-list', '/school/staff', ['create']],
	['school-staff-detail', '/school/staff/staff-1/profile', ['create', 'edit-profile', 'delete']],
	['school-staff-permissions', '/school/staff/staff-1/permissions', ['add-permission', 'delete-permission']],
	['school-teachers-list', '/school/teachers', ['create']],
	[
		'school-teachers-detail',
		'/school/teachers/teacher-1/availability',
		[
			'create',
			'edit-profile',
			'delete',
			'add-unavailability',
			'edit-unavailability',
			'delete-unavailability',
		],
	],
	['school-teachers-assignments', '/school/teachers/teacher-1/assignments', ['form']],
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
			'session-attendance',
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
	['class-attendance-detail', '/classes/class-1/attendance/day-1', ['record-attendance']],
	['configuration-school', '/configuration/school', ['edit']],
	[
		'configuration-academic',
		'/configuration/academic',
		[
			'create',
			'period-def',
			'period-def-wizard',
			'delete-period-def',
			'archive-year',
			'publish-year',
			'publish-period',
		],
	],
	['configuration-grade-levels-list', '/configuration/grade-levels', ['create']],
	[
		'configuration-grade-levels-detail',
		'/configuration/grade-levels/grade-1',
		['create', 'edit', 'delete'],
	],
	['configuration-classes-list', '/configuration/classes', ['create']],
	[
		'configuration-classes-detail',
		'/configuration/classes/class-1/profile',
		['create', 'edit'],
	],
	[
		'configuration-classes-assignments',
		'/configuration/classes/class-1/assignments',
		['form', 'delete-assignment'],
	],
	['configuration-subjects-list', '/configuration/subjects', ['create-subject']],
	[
		'configuration-subjects-detail',
		'/configuration/subjects/subject-1/logbook',
		['create-subject', 'edit-subject', 'delete'],
	],
	[
		'configuration-subjects-progression',
		'/configuration/subjects/subject-1/progression',
		['add-chapter', 'edit-chapter', 'delete-chapter'],
	],
	['configuration-report-cards-list', '/configuration/report-cards', ['create']],
	[
		'configuration-report-cards-detail',
		'/configuration/report-cards/report-card-1',
		['create', 'delete'],
	],
	['configuration-grade-scales', '/configuration/grade-scales', ['create', 'edit', 'delete']],
	['configuration-notifications-list', '/configuration/notifications', ['reset-all']],
	[
		'configuration-notifications-detail',
		'/configuration/notifications/report_card.published',
		['edit', 'reset-key', 'reset-all'],
	],
	['configuration-discipline', '/configuration/discipline', ['create', 'edit', 'delete']],
	[
		'configuration-tools',
		'/configuration/tools',
		['import', 'generate-timetable', 'publish-timetable'],
	],
	[
		'configuration-teacher-assignments',
		'/configuration/tools/teacher-assignments',
		['create'],
	],
	['finance-fees', '/finance/fees', ['create', 'edit', 'archive']],
	['finance-billing-list', '/finance/billing', ['assign-fee']],
	['finance-billing-detail', '/finance/billing/billing-1', ['assign-fee', 'payment', 'allocate', 'unallocate', 'waive', 'adjust', 'cancel']],
	['finance-payments', '/finance/payment', ['reverse', 'refund']],
] as const;

describe('route modal catalog', () => {
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
		expect(isKnownModalForPathname('/configuration/classes/class-1/', 'edit')).toBeTrue();
		expect(isKnownModalForPathname('/classes/class-1/timetable/session-1', 'edit-event')).toBeTrue();
	});
});
