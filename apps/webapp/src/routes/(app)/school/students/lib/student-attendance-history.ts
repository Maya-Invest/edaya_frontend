import type { ClassAttendanceMode, StudentAttendanceHistoryItem } from '$lib/types/school';

export function classAttendanceModeForStudent(
	classes: readonly { id: string; attendanceMode: ClassAttendanceMode }[],
	classId: string,
): ClassAttendanceMode | undefined {
	return classes.find(entry => entry.id === classId)?.attendanceMode;
}

export function summarizeStudentAttendanceHistory(
	records: readonly StudentAttendanceHistoryItem[],
): {
	records: StudentAttendanceHistoryItem[];
	present: number;
	absent: number;
	late: number;
} {
	return {
		records: [...records],
		present: records.filter(record => record.status === 'present').length,
		absent: records.filter(record => record.status === 'absent').length,
		late: records.filter(record => record.status === 'late').length,
	};
}

export function patchAttendanceHistory(
	records: readonly StudentAttendanceHistoryItem[],
	record: StudentAttendanceHistoryItem,
	dropIds: readonly string[] = [],
): StudentAttendanceHistoryItem[] {
	const dropped = new Set(dropIds);
	dropped.add(record.id);
	const next = [
		...records.filter((entry) => {
			if (dropped.has(entry.id)) {
				return false;
			}
			return !(record.kind === 'daily' && entry.kind === 'daily' && entry.date === record.date);
		}),
		record,
	];
	return next.sort((left, right) => `${right.date}${right.time}`.localeCompare(`${left.date}${left.time}`));
}

export function removeAttendanceHistory(
	records: readonly StudentAttendanceHistoryItem[],
	id: string,
): StudentAttendanceHistoryItem[] {
	return records.filter(record => record.id !== id);
}

export function dailyAttendanceHistoryItem(input: {
	id: string;
	date: string;
	status: StudentAttendanceHistoryItem['status'];
	label?: string;
	time?: string;
}): StudentAttendanceHistoryItem {
	return {
		id: input.id,
		date: input.date,
		time: input.time ?? '—',
		label: input.label ?? 'Appel du jour',
		status: input.status,
		kind: 'daily',
	};
}
