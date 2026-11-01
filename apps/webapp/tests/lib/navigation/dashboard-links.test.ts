import type { ClassNode } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import {
	dashboardActionHref,
	dashboardAttendanceTodayHref,
	dashboardClassStudentsHref,
} from '$lib/navigation/dashboard-links';

const classes = [
	{ id: 'ci-6a', name: '6ème A', attendanceMode: 'session' },
	{ id: 'ci-6b', name: '6ème B', attendanceMode: 'daily' },
] as ClassNode[];

describe('dashboardActionHref', () => {
	it('resolves school-wide action targets', () => {
		expect(dashboardActionHref('overdue_fees', classes)).toBe('/finance/billing/');
		expect(dashboardActionHref('pending_justifications', classes)).toBe('/school/students/');
		expect(dashboardActionHref('pending_student_photos', classes)).toBe('/school/students/?photoReview=pending');
		expect(dashboardActionHref('high_severity_incidents', classes)).toBe('/school/events/');
	});

	it('resolves incomplete grading to the first active class evaluations route', () => {
		expect(dashboardActionHref('incomplete_grading', classes)).toBe('/classes/ci-6a/evaluations/');
	});

	it('maps stale class ids from overview payloads to demo-ci class routes', () => {
		expect(dashboardClassStudentsHref('6a', classes)).toBe('/classes/ci-6a/students/');
		expect(dashboardClassStudentsHref('ci-6b', classes)).toBe('/classes/ci-6b/students/');
	});
});

describe('dashboardAttendanceTodayHref', () => {
	it('links to the first daily class attendance route', () => {
		expect(dashboardAttendanceTodayHref(classes)).toBe('/classes/ci-6b/attendance/');
	});

	it('prefers the active class when it is daily', () => {
		const dailyFirst = [
			{ id: 'ci-6a', name: '6ème A', attendanceMode: 'daily' },
			{ id: 'ci-6b', name: '6ème B', attendanceMode: 'daily' },
		] as ClassNode[];
		expect(dashboardAttendanceTodayHref(dailyFirst)).toBe('/classes/ci-6a/attendance/');
	});

	it('returns null when no class uses daily roll call', () => {
		const sessionOnly = [
			{ id: 'ci-6a', name: '6ème A', attendanceMode: 'session' },
		] as ClassNode[];
		expect(dashboardAttendanceTodayHref(sessionOnly)).toBeNull();
	});
});
