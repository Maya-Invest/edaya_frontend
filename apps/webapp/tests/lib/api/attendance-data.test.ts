import { describe, expect, it } from 'bun:test';
import {
	dailyAttendanceOccurrenceId,
	ensureTodayAttendanceDay,
	parseDailyAttendanceOccurrenceId,
} from '../../../src/lib/api/attendance-data';

describe('daily attendance day helpers', () => {
	it('builds and parses occurrence ids', () => {
		expect(dailyAttendanceOccurrenceId('ci-6a', '2026-07-23')).toBe('ci-6a:2026-07-23');
		expect(parseDailyAttendanceOccurrenceId('ci-6a:2026-07-23')).toEqual({
			classGroupId: 'ci-6a',
			dateIso: '2026-07-23',
		});
		expect(parseDailyAttendanceOccurrenceId('invalid')).toBeNull();
	});

	it('prepends today when missing from the list', () => {
		const days = ensureTodayAttendanceDay(
			[{
				id: 'ci-6a:2026-06-16',
				classId: 'ci-6a',
				date: '2026-06-16',
				label: 'Daily attendance',
				totalStudents: 6,
				recordedCount: 6,
			}],
			'ci-6a',
			6,
			'2026-07-23',
		);

		expect(days).toHaveLength(2);
		expect(days[0]).toMatchObject({
			id: 'ci-6a:2026-07-23',
			date: '2026-07-23',
			recordedCount: 0,
			totalStudents: 6,
		});
	});

	it('does not duplicate today when already present', () => {
		const days = ensureTodayAttendanceDay(
			[{
				id: 'ci-6a:2026-07-23',
				classId: 'ci-6a',
				date: '2026-07-23',
				label: 'Daily attendance',
				totalStudents: 6,
				recordedCount: 2,
			}],
			'ci-6a',
			6,
			'2026-07-23',
		);

		expect(days).toHaveLength(1);
		expect(days[0]?.recordedCount).toBe(2);
	});
});
