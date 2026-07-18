import { describe, expect, it } from 'bun:test';
import {
	attendanceClassIdFromUrl,
	attendanceDayDetailIdFromUrl,
} from '../../../../../src/routes/(app)/classes/[classId]/attendance/lib/attendance-helpers';

describe('attendance route helpers', () => {
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
