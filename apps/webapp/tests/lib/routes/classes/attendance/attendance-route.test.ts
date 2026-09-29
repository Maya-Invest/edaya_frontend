import { describe, expect, it } from 'bun:test';
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
