import type { SessionAttendanceStatus } from '$lib/types/session-detail';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { t } from '$lib/i18n';
import { sessionDetailContext } from '$lib/session-detail/context.svelte';
import { get } from 'svelte/store';

function countRecordedRows(occurrenceId: string): number {
	const detail = sessionDetailContext.get(occurrenceId);
	return detail?.attendance.filter(row => row.status).length ?? 0;
}

export async function recordDailyAttendanceForDayMutation(input: {
	occurrenceId: string;
	classGroupId: string;
	date: string;
	studentId: string;
	status: SessionAttendanceStatus;
	attendanceId?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = input.attendanceId ?? `att-${input.studentId}-${input.date}`;
	const previous = sessionDetailContext.get(input.occurrenceId)?.attendance.find(
		row => row.studentId === input.studentId,
	);
	const hadStatus = previous?.status !== undefined;

	const result = await runMutation(() => client.commands.recordDailyAttendance({
		id,
		studentId: input.studentId,
		classGroupId: input.classGroupId,
		date: input.date,
		status: input.status,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			sessionDetailContext.patchAttendance(input.occurrenceId, input.studentId, {
				attendanceId: id,
				status: input.status,
			});
			if (!hadStatus) {
				detailDataContext.patchAttendanceDay(input.occurrenceId, {
					recordedCount: countRecordedRows(input.occurrenceId),
				});
			}
		},
		rollback: () => {
			if (previous) {
				sessionDetailContext.patchAttendance(input.occurrenceId, input.studentId, previous);
				detailDataContext.patchAttendanceDay(input.occurrenceId, {
					recordedCount: countRecordedRows(input.occurrenceId),
				});
			}
		},
	});
	return result !== null;
}

export async function recordClassDailyAttendanceMutation(input: {
	occurrenceId: string;
	classGroupId: string;
	date: string;
	attendanceByStudent: Record<string, SessionAttendanceStatus>;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previousDetail = sessionDetailContext.get(input.occurrenceId);
	const previousDay = detailDataContext.attendanceDays.find(day => day.id === input.occurrenceId);

	const result = await runMutation(() => client.commands.recordClassDailyAttendance({
		classGroupId: input.classGroupId,
		date: input.date,
		attendanceByStudent: input.attendanceByStudent,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage ?? get(t)('attendanceDay.bulkSuccess'),
		apply: () => {
			for (const [studentId, status] of Object.entries(input.attendanceByStudent)) {
				sessionDetailContext.patchAttendance(input.occurrenceId, studentId, {
					attendanceId: `att-${studentId}-${input.date}`,
					status,
				});
			}
			detailDataContext.patchAttendanceDay(input.occurrenceId, {
				recordedCount: countRecordedRows(input.occurrenceId),
			});
		},
		rollback: () => {
			if (previousDetail) {
				sessionDetailContext.hydrate(input.occurrenceId, previousDetail);
			}
			if (previousDay) {
				detailDataContext.patchAttendanceDay(input.occurrenceId, {
					recordedCount: previousDay.recordedCount,
				});
			}
		},
	});
	return result !== null;
}
