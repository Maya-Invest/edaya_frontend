import { describe, expect, it } from 'bun:test';
import {
	drawerTabRouteCacheKey,
	isLikelyDetailPath,
	listRouteCacheKey,
} from '$lib/detail-route-patterns';

describe('isLikelyDetailPath', () => {
	it('recognizes school student drawer tabs', () => {
		expect(isLikelyDetailPath('/school/students/stu-1')).toBe(true);
		expect(isLikelyDetailPath('/school/students/stu-1/profile')).toBe(true);
		expect(isLikelyDetailPath('/school/students/stu-1/grades')).toBe(true);
		expect(isLikelyDetailPath('/school/students')).toBe(false);
	});

	it('recognizes school staff drawer tabs', () => {
		expect(isLikelyDetailPath('/school/staff/stf-1')).toBe(true);
		expect(isLikelyDetailPath('/school/staff/stf-1/profile')).toBe(true);
		expect(isLikelyDetailPath('/school/staff/stf-1/permissions')).toBe(true);
		expect(isLikelyDetailPath('/school/staff')).toBe(false);
	});

	it('recognizes school teacher drawer tabs', () => {
		expect(isLikelyDetailPath('/school/teachers/tch-1')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers/tch-1/profile')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers/tch-1/assignments')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers/tch-1/availability')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers/tch-1/timetable')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers/tch-1/evaluations')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers/tch-1/family-feedback')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers/tch-1/documents')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers')).toBe(false);
	});

	it('recognizes school activity drawer tabs', () => {
		expect(isLikelyDetailPath('/school/activities/act-1')).toBe(true);
		expect(isLikelyDetailPath('/school/activities/act-1/profile')).toBe(true);
		expect(isLikelyDetailPath('/school/activities/act-1/students')).toBe(true);
		expect(isLikelyDetailPath('/school/activities/act-1/classes')).toBe(true);
		expect(isLikelyDetailPath('/school/activities')).toBe(false);
	});

	it('recognizes class student drawer tabs', () => {
		expect(isLikelyDetailPath('/classes/6a/students/stu-1')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/students/stu-1/profile')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/students/stu-1/grades')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/students/stu-1/documents')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/students')).toBe(false);
	});

	it('recognizes class evaluations drawer tabs', () => {
		expect(isLikelyDetailPath('/classes/6a/evaluations/e-1')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/evaluations/e-1/details')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/evaluations/e-1/grading')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/evaluations')).toBe(false);
	});

	it('recognizes class timetable drawer tabs', () => {
		expect(isLikelyDetailPath('/classes/6a/timetable/s-1')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/timetable/s-1/details')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/timetable/s-1/attendance')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/timetable/s-1/logbook')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/timetable')).toBe(false);
	});

	it('recognizes class attendance drawer paths', () => {
		expect(isLikelyDetailPath('/classes/6a/attendance/day-1')).toBe(true);
		expect(isLikelyDetailPath('/classes/6a/attendance')).toBe(false);
	});

	it('recognizes finance billing drawer paths', () => {
		expect(isLikelyDetailPath('/finance/billing/sf-1')).toBe(true);
		expect(isLikelyDetailPath('/finance/billing')).toBe(false);
	});

	it('recognizes configuration report-cards drawer paths', () => {
		expect(isLikelyDetailPath('/configuration/report-cards/rcd-1')).toBe(true);
		expect(isLikelyDetailPath('/configuration/report-cards')).toBe(false);
	});

	it('recognizes configuration notification template drawer paths', () => {
		expect(isLikelyDetailPath('/configuration/notifications/report_card.published')).toBe(true);
		expect(isLikelyDetailPath('/configuration/notifications')).toBe(false);
	});
});

describe('listRouteCacheKey', () => {
	it('maps school student drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/school/students'))).toBe('/school/students');
		expect(listRouteCacheKey(new URL('http://local/school/students/stu-1'))).toBe('/school/students');
		expect(listRouteCacheKey(new URL('http://local/school/students/stu-1/profile'))).toBe('/school/students');
		expect(listRouteCacheKey(new URL('http://local/school/students/stu-1/grades'))).toBe('/school/students');
		expect(listRouteCacheKey(new URL('http://local/school/students/stu-1/attendance?q=ada'))).toBe('/school/students');
	});

	it('still strips single-segment detail paths for other entities', () => {
		expect(listRouteCacheKey(new URL('http://local/school/guardians/g-1'))).toBe('/school/guardians');
	});

	it('maps school staff drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/school/staff'))).toBe('/school/staff');
		expect(listRouteCacheKey(new URL('http://local/school/staff/stf-1'))).toBe('/school/staff');
		expect(listRouteCacheKey(new URL('http://local/school/staff/stf-1/profile'))).toBe('/school/staff');
		expect(listRouteCacheKey(new URL('http://local/school/staff/stf-1/permissions'))).toBe('/school/staff');
		expect(listRouteCacheKey(new URL('http://local/school/staff/stf-1/assignments'))).toBe('/school/staff');
	});

	it('maps school teacher drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/school/teachers'))).toBe('/school/teachers');
		expect(listRouteCacheKey(new URL('http://local/school/teachers/tch-1'))).toBe('/school/teachers');
		expect(listRouteCacheKey(new URL('http://local/school/teachers/tch-1/profile'))).toBe('/school/teachers');
		expect(listRouteCacheKey(new URL('http://local/school/teachers/tch-1/assignments'))).toBe('/school/teachers');
		expect(listRouteCacheKey(new URL('http://local/school/teachers/tch-1/availability'))).toBe('/school/teachers');
	});

	it('maps school activity drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/school/activities'))).toBe('/school/activities');
		expect(listRouteCacheKey(new URL('http://local/school/activities/act-1'))).toBe('/school/activities');
		expect(listRouteCacheKey(new URL('http://local/school/activities/act-1/profile'))).toBe('/school/activities');
		expect(listRouteCacheKey(new URL('http://local/school/activities/act-1/students'))).toBe('/school/activities');
		expect(listRouteCacheKey(new URL('http://local/school/activities/act-1/classes'))).toBe('/school/activities');
	});

	it('maps class student drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/classes/6a/students'))).toBe('/classes/6a/students');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/students/stu-1'))).toBe('/classes/6a/students');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/students/stu-1/profile'))).toBe('/classes/6a/students');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/students/stu-1/grades'))).toBe('/classes/6a/students');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/students/stu-1/documents'))).toBe('/classes/6a/students');
	});

	it('maps class evaluations drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/classes/6a/evaluations'))).toBe('/classes/6a/evaluations');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/evaluations/e-1'))).toBe('/classes/6a/evaluations');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/evaluations/e-1/details'))).toBe('/classes/6a/evaluations');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/evaluations/e-1/grading'))).toBe('/classes/6a/evaluations');
	});

	it('maps class timetable drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/classes/6a/timetable'))).toBe('/classes/6a/timetable');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/timetable/s-1'))).toBe('/classes/6a/timetable');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/timetable/s-1/details'))).toBe('/classes/6a/timetable');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/timetable/s-1/attendance'))).toBe('/classes/6a/timetable');
	});

	it('maps class attendance drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/classes/6a/attendance'))).toBe('/classes/6a/attendance');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/attendance/day-1'))).toBe('/classes/6a/attendance');
	});

	it('maps finance billing drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/finance/billing'))).toBe('/finance/billing');
		expect(listRouteCacheKey(new URL('http://local/finance/billing/sf-1'))).toBe('/finance/billing');
	});

	it('maps configuration report-cards drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/configuration/report-cards'))).toBe('/configuration/report-cards');
		expect(listRouteCacheKey(new URL('http://local/configuration/report-cards/rcd-1'))).toBe('/configuration/report-cards');
	});

	it('maps configuration notification template drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/configuration/notifications'))).toBe('/configuration/notifications');
		expect(listRouteCacheKey(new URL('http://local/configuration/notifications/report_card.published'))).toBe(
			'/configuration/notifications',
		);
	});
});

describe('drawerTabRouteCacheKey', () => {
	it('keeps pathname-specific keys separate from the list cache', () => {
		expect(drawerTabRouteCacheKey(new URL('http://local/school/students/stu-1'))).toBe('/school/students/stu-1');
		expect(drawerTabRouteCacheKey(new URL('http://local/school/students/stu-1/profile'))).toBe('/school/students/stu-1/profile');
		expect(drawerTabRouteCacheKey(new URL('http://local/school/students/stu-1/grades'))).toBe('/school/students/stu-1/grades');
	});
});
