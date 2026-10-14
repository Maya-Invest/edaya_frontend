import type { SessionAttendanceRow, SessionAttendanceStatus } from '$lib/types/session-detail';

export const ROLL_CALL_STATUSES = ['present', 'absent', 'late'] as const;

export function validRollCallDate(date: string, today: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) {
		return false;
	}
	const parsed = new Date(`${date}T00:00:00.000Z`);
	return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function completeRollCall(roster: readonly SessionAttendanceRow[], marks: Record<string, SessionAttendanceStatus>): boolean {
	return roster.length > 0 && roster.every(row => ROLL_CALL_STATUSES.includes(marks[row.studentId]));
}

export function markUnrecordedPresent(roster: readonly SessionAttendanceRow[], marks: Record<string, SessionAttendanceStatus>): Record<string, SessionAttendanceStatus> {
	return Object.fromEntries(roster.map(row => [row.studentId, marks[row.studentId] ?? 'present']));
}
