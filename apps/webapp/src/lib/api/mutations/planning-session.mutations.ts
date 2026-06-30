import type { SessionAttendanceStatus, SessionLogbook } from '$lib/types/session-detail';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { sessionDetailContext } from '$lib/session-detail/context.svelte';
import { get } from 'svelte/store';

function schoolId(): string {
	return authSession.schoolId ?? '';
}

export async function recordSessionStudentAttendanceMutation(input: {
	sessionId: string;
	studentId: string;
	status: SessionAttendanceStatus;
	attendanceId?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = input.attendanceId ?? `${input.studentId}-${input.sessionId}`;
	const previous = sessionDetailContext.get(input.sessionId)?.attendance.find(row => row.studentId === input.studentId);

	const result = await runMutation(() => client.commands.recordAttendance({
		id,
		studentId: input.studentId,
		sessionId: input.sessionId,
		status: input.status,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			sessionDetailContext.patchAttendance(input.sessionId, input.studentId, {
				attendanceId: id,
				status: input.status,
			});
		},
		rollback: () => {
			if (previous) {
				sessionDetailContext.patchAttendance(input.sessionId, input.studentId, previous);
			}
		},
	});
	return result !== null;
}

export async function saveSessionLogbookMutation(input: {
	sessionId: string;
	classGroupId: string;
	classSubjectId: string;
	date: string;
	logbookId?: string;
	chapter: string;
	content: string;
	objectives: string[];
	homework?: string;
	progress: number;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const resolvedSchoolId = schoolId();
	if (!resolvedSchoolId || !input.classSubjectId) {
		return false;
	}

	const entryId = input.logbookId ?? `log-${input.sessionId}-${Date.now().toString(36)}`;
	const nextLogbook: SessionLogbook = {
		id: entryId,
		chapter: input.chapter.trim(),
		content: input.content.trim(),
		objectives: input.objectives,
		homework: input.homework?.trim() || undefined,
		progress: input.progress,
	};
	const previous = sessionDetailContext.get(input.sessionId)?.logbook;

	const result = await runMutation(() => client.entities.classLogbookEntries.save({
		id: entryId,
		schoolId: resolvedSchoolId,
		classGroupId: input.classGroupId,
		classSubjectId: input.classSubjectId,
		date: input.date,
		chapter: input.chapter.trim(),
		content: input.content.trim(),
		objectives: input.objectives,
		homework: input.homework?.trim() || null,
		attachments: [],
		progress: input.progress,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage ?? get(t)('planning.session.logbookSuccess'),
		apply: () => {
			sessionDetailContext.patchLogbook(input.sessionId, nextLogbook);
		},
		rollback: () => {
			sessionDetailContext.patchLogbook(input.sessionId, previous);
		},
	});
	return result !== null;
}
