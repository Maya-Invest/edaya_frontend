import { describe, expect, it } from 'bun:test';
import {
	classAttendanceModeForStudent,
	dailyAttendanceHistoryItem,
	patchAttendanceHistory,
	summarizeStudentAttendanceHistory,
} from '../../../../../src/routes/(app)/school/students/lib/student-attendance-history';

describe('student attendance history', () => {
	it('uses class attendanceMode to decide Declare vs timetable', () => {
		const classes = [
			{ id: 'daily-class', attendanceMode: 'daily' as const },
			{ id: 'session-class', attendanceMode: 'session' as const },
		];
		expect(classAttendanceModeForStudent(classes, 'daily-class')).toBe('daily');
		expect(classAttendanceModeForStudent(classes, 'session-class')).toBe('session');
	});

	it('patches the history by id and recomputes present/absent/late', () => {
		const first = dailyAttendanceHistoryItem({
			id: 'att-1',
			date: '2026-09-21',
			status: 'absent',
		});
		const patched = patchAttendanceHistory([first], dailyAttendanceHistoryItem({
			id: 'att-1',
			date: '2026-09-21',
			status: 'late',
		}));
		const summary = summarizeStudentAttendanceHistory(patched);
		expect(summary.absent).toBe(0);
		expect(summary.late).toBe(1);
		expect(summary.present).toBe(0);
		expect(summary.records).toHaveLength(1);
	});

	it('replaces a daily row by date when the correction id differs', () => {
		const loaded = dailyAttendanceHistoryItem({
			id: 'att-loaded',
			date: '2026-09-21',
			status: 'absent',
		});
		const patched = patchAttendanceHistory(
			[loaded],
			dailyAttendanceHistoryItem({
				id: 'att-server',
				date: '2026-09-21',
				status: 'late',
			}),
			['att-opt'],
		);
		const summary = summarizeStudentAttendanceHistory(patched);
		expect(summary.records).toHaveLength(1);
		expect(summary.records[0]?.id).toBe('att-server');
		expect(summary.absent).toBe(0);
		expect(summary.late).toBe(1);
		expect(summary.present).toBe(0);
	});
});
