import { describe, expect, it } from 'bun:test';
import { completeRollCall, markUnrecordedPresent, validRollCallDate } from '../../../../../src/routes/(app)/classes/[classId]/attendance/lib/roll-call';
import {
	attendanceClassIdFromUrl,
	attendanceDayDetailIdFromUrl,
} from '../../../../../src/routes/(app)/classes/[classId]/attendance/lib/attendance-helpers';

describe('attendance route helpers', () => {
	it('decodes composite day IDs used by deep links and reloaded drawers', () => {
		const url = new URL('http://local/classes/6a/attendance/6a%3A2026-09-28?modal=record-attendance');
		expect(attendanceDayDetailIdFromUrl(url)).toBe('6a:2026-09-28');
		expect(attendanceDayDetailIdFromUrl(new URL('http://local/classes/6a/attendance/%ZZ'))).toBeUndefined();
	});

	it('parses class and day ids from attendance URLs', () => {
		const url = new URL('http://local/classes/6a/attendance/day-1');
		expect(attendanceClassIdFromUrl(url)).toBe('6a');
		expect(attendanceDayDetailIdFromUrl(url)).toBe('day-1');
	});

	it('parses class id from list URL', () => {
		const url = new URL('http://local/classes/6a/attendance');
		expect(attendanceClassIdFromUrl(url)).toBe('6a');
		expect(attendanceDayDetailIdFromUrl(url)).toBeUndefined();
	});
});


describe('new roll call validation', () => {
	const roster = [{ studentId: 'a', studentName: 'A', studentInitials: 'A' }, { studentId: 'b', studentName: 'B', studentInitials: 'B' }];
	it('requires a nonempty roster and an explicit valid status for every student', () => {
		expect(completeRollCall([], {})).toBe(false);
		expect(completeRollCall(roster, { a: 'absent' })).toBe(false);
		expect(completeRollCall(roster, { a: 'absent', b: 'late' })).toBe(true);
	});
	it('mark all present preserves explicit absences and lateness', () => {
		expect(markUnrecordedPresent(roster, { a: 'absent' })).toEqual({ a: 'absent', b: 'present' });
		expect(markUnrecordedPresent(roster, { a: 'late' })).toEqual({ a: 'late', b: 'present' });
	});
	it('accepts real past/today civil dates and rejects future or malformed dates', () => {
		for (const date of ['2026-10-13', '2024-02-29'])
			expect(validRollCallDate(date, '2026-10-13')).toBe(true);
		for (const date of ['', '2026-10-14', '2026-02-30', '2025-02-29', '2026-1-01'])
			expect(validRollCallDate(date, '2026-10-13')).toBe(false);
	});
});
