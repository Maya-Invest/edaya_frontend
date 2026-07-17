import type { ClassNode } from '$lib/types/school';
import type { ResolvedPathname } from '$app/types';
import { describe, expect, it } from 'bun:test';
import {
	homeroomDailyClassesForStaff,
	resolveHomeroomAttendanceNudges,
} from '$lib/school/homeroom-attendance-nudge';

const classes = [
	{
		id: 'ci-6a',
		name: '6ème A',
		attendanceMode: 'daily',
		homeroomStaffId: 'ci-st3',
	},
	{
		id: 'ci-6b',
		name: '6ème B',
		attendanceMode: 'daily',
		homeroomStaffId: 'ci-st9',
	},
	{
		id: 'ci-5a',
		name: '5ème A',
		attendanceMode: 'session',
		homeroomStaffId: 'ci-st3',
	},
] as ClassNode[];

describe('homeroomDailyClassesForStaff', () => {
	it('returns only daily homeroom classes for the signed-in staff member', () => {
		expect(homeroomDailyClassesForStaff(classes, 'ci-st3').map(cls => cls.id)).toEqual(['ci-6a']);
	});
});

describe('resolveHomeroomAttendanceNudges', () => {
	const href = (classId: string, dayId?: string): ResolvedPathname =>
		(dayId ? `/classes/${classId}/attendance/${dayId}/` : `/classes/${classId}/attendance/`) as ResolvedPathname;

	it('nudges when today attendance is incomplete', () => {
		const rows = resolveHomeroomAttendanceNudges({
			staffId: 'ci-st3',
			classes,
			todayIso: '2026-07-06',
			classAttendanceHref: href,
			attendanceByClass: new Map([
				['ci-6a', {
					studentCount: 6,
					days: [{
						id: 'ci-6a:2026-07-06',
						classId: 'ci-6a',
						date: '2026-07-06',
						label: 'Daily attendance',
						totalStudents: 6,
						recordedCount: 2,
					}],
				}],
			]),
		});

		expect(rows).toEqual([{
			classId: 'ci-6a',
			className: '6ème A',
			href: '/classes/ci-6a/attendance/ci-6a:2026-07-06/',
		}]);
	});

	it('nudges when no occurrence exists yet but the class has enrolled students', () => {
		const rows = resolveHomeroomAttendanceNudges({
			staffId: 'ci-st3',
			classes,
			todayIso: '2026-07-06',
			classAttendanceHref: href,
			attendanceByClass: new Map([
				['ci-6a', { studentCount: 6, days: [] }],
			]),
		});

		expect(rows).toEqual([{
			classId: 'ci-6a',
			className: '6ème A',
			href: '/classes/ci-6a/attendance/',
		}]);
	});

	it('nudges when enrollment count is unavailable', () => {
		const rows = resolveHomeroomAttendanceNudges({
			staffId: 'ci-st3',
			classes,
			todayIso: '2026-07-06',
			classAttendanceHref: href,
			attendanceByClass: new Map([
				['ci-6a', { studentCount: 0, days: [] }],
			]),
		});

		expect(rows).toEqual([{
			classId: 'ci-6a',
			className: '6ème A',
			href: '/classes/ci-6a/attendance/',
		}]);
	});

	it('skips completed roll call and non-homeroom classes', () => {
		const rows = resolveHomeroomAttendanceNudges({
			staffId: 'ci-st3',
			classes,
			todayIso: '2026-07-06',
			classAttendanceHref: href,
			attendanceByClass: new Map([
				['ci-6a', {
					studentCount: 6,
					days: [{
						id: 'ci-6a:2026-07-06',
						classId: 'ci-6a',
						date: '2026-07-06',
						label: 'Daily attendance',
						totalStudents: 6,
						recordedCount: 6,
					}],
				}],
			]),
		});

		expect(rows).toEqual([]);
	});
});
