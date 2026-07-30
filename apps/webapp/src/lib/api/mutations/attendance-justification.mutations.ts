import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export async function requestAttendanceJustificationMutation(input: {
	studentId: string;
	attendanceId: string;
	reason: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.requestAttendanceJustification({
			studentId: input.studentId,
			attendanceId: input.attendanceId,
			reason: input.reason.trim(),
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['attendance'],
		},
	);
	return result !== null;
}

export async function reviewAttendanceJustificationMutation(input: {
	studentId: string;
	attendanceId?: string;
	lessonSessionId?: string;
	decision: 'excused' | 'rejected';
	reason: string;
	notes?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.reviewAttendanceJustification({
			studentId: input.studentId,
			attendanceId: input.attendanceId,
			lessonSessionId: input.lessonSessionId,
			decision: input.decision,
			reason: input.reason.trim(),
			notes: input.notes?.trim() || undefined,
			reviewedAt: new Date().toISOString(),
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['attendance'],
		},
	);
	return result !== null;
}
