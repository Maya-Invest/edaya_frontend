import type { PlanningEventKind } from '$lib/types/school';
import type { SessionAttendanceStatus, SessionLogbook } from '$lib/types/session-detail';
import { buildLessonSessionSavePayload } from '$lib/api/lesson-session-save-payload';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { t } from '$lib/i18n';
import { sessionDetailContext } from '$lib/session-detail/context.svelte';
import { get } from 'svelte/store';

export async function recordSessionStudentAttendanceMutation(input: {
	sessionId: string;
	kind?: PlanningEventKind;
	studentId: string;
	status: SessionAttendanceStatus;
	attendanceId?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = input.attendanceId ?? `${input.studentId}-${input.sessionId}`;
	const previous = sessionDetailContext.get(input.sessionId)?.attendance.find(row => row.studentId === input.studentId);
	const anchor = input.kind === 'activity'
		? { activitySessionId: input.sessionId }
		: input.kind === 'assessment'
			? { assessmentId: input.sessionId }
			: { lessonSessionId: input.sessionId };

	const result = await runMutation(() => client.commands.recordAttendance({
		id,
		studentId: input.studentId,
		...anchor,
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
	classSubjectMatterId?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const classSubjectMatterId = input.classSubjectMatterId;
	if (!input.classSubjectId || !classSubjectMatterId) {
		return false;
	}

	const progressId = input.logbookId ?? `csp-${input.sessionId}-${Date.now().toString(36)}`;
	const nextLogbook: SessionLogbook = {
		id: progressId,
		chapter: input.chapter.trim(),
		content: input.content.trim(),
		objectives: input.objectives,
		homework: input.homework?.trim() || undefined,
		progress: input.progress,
	};
	const previous = sessionDetailContext.get(input.sessionId)?.logbook;

	const result = await runMutation(async () => {
		const session = await client.entities.lessonSessions.get(input.sessionId);
		await client.entities.lessonSessions.save(
			buildLessonSessionSavePayload(session, {
				displayLabel: session.displayLabel,
				sessionNote: input.content.trim() || null,
			}),
		);
		await client.commands.recordLessonSessionProgress({
			id: progressId,
			classSubjectMatterId,
			lessonSessionId: input.sessionId,
			completedPercentage: input.progress,
			notes: input.objectives.join('\n').trim() || null,
			recordedAt: new Date().toISOString(),
		});
	}, {
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
