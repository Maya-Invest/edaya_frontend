import type { components } from '$lib/api/schema';
import type { ScheduleDayOfWeek } from '$lib/components/school/scheduling/planning-calendar';
import type { PlanningEvent } from '$lib/types/school';
import { buildLessonSessionSavePayload } from '$lib/api/lesson-session-save-payload';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import {
	mondayOfWeekUtc,
	sessionInstantsForSlot,
} from '$lib/components/school/scheduling/planning-calendar';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

function sessionInstantsForWeek(
	weekStart: Date,
	day: PlanningEvent['day'],
	start: string,
	end: string,
): { startsAt: string; endsAt: string } {
	const weekAnchor = mondayOfWeekUtc(weekStart).toISOString();
	const instants = sessionInstantsForSlot(weekAnchor, {
		day,
		startTime: start,
		endTime: end,
	});
	return {
		startsAt: instants.startsAt.toISOString(),
		endsAt: instants.endsAt.toISOString(),
	};
}

function sessionInstantsForExistingWeek(
	referenceStartsAt: string,
	day: PlanningEvent['day'],
	start: string,
	end: string,
): { startsAt: string; endsAt: string } {
	const instants = sessionInstantsForSlot(referenceStartsAt, {
		day,
		startTime: start,
		endTime: end,
	});
	return {
		startsAt: instants.startsAt.toISOString(),
		endsAt: instants.endsAt.toISOString(),
	};
}

function planningSnapshot(sessionId: string): PlanningEvent | undefined {
	return detailDataContext.planning.find(event => event.id === sessionId);
}

function specificDateForWeek(weekStart: Date, day: PlanningEvent['day']): string {
	const weekAnchor = mondayOfWeekUtc(weekStart);
	const date = new Date(weekAnchor);
	const offset = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 }[day] ?? 0;
	date.setUTCDate(date.getUTCDate() + offset);
	return date.toISOString().slice(0, 10);
}

function lessonSessionIdForScheduleDate(scheduleId: string, specificDate: string): string {
	return `${scheduleId}:${specificDate}`;
}

async function resolveMaterializedLessonSession(
	client: ReturnType<typeof getBrowserSchoolClient>,
	scheduleId: string,
	specificDate: string,
	materialized: Array<components['schemas']['LessonSession'] | components['schemas']['ActivitySession']>,
): Promise<components['schemas']['LessonSession'] | null> {
	const fromBatch = materialized.find(
		(entry): entry is components['schemas']['LessonSession'] =>
			'classSubjectId' in entry && entry.scheduleId === scheduleId,
	);
	if (fromBatch) {
		return fromBatch;
	}

	try {
		return await client.entities.lessonSessions.get(lessonSessionIdForScheduleDate(scheduleId, specificDate));
	}
	catch {
		return null;
	}
}

export async function createSessionMutation(input: {
	classGroupId: string;
	title: string;
	classSubjectId?: string;
	scheduleId?: string;
	weekStart: Date;
	day: PlanningEvent['day'];
	start: string;
	end: string;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		toast.error(get(t)('dataState.errorDescription'));
		return null;
	}

	if (!input.classSubjectId) {
		toast.error(get(t)('planning.createSubjectRequired'));
		return null;
	}

	const specificDate = specificDateForWeek(input.weekStart, input.day);
	const { startsAt, endsAt } = sessionInstantsForWeek(input.weekStart, input.day, input.start, input.end);
	const subject = detailDataContext.subjects.find(entry => entry.id === input.classSubjectId);
	const optimisticId = `ls-${Date.now().toString(36)}`;
	const optimistic: PlanningEvent = {
		id: optimisticId,
		classId: input.classGroupId,
		scheduleId: input.scheduleId,
		kind: 'lesson',
		title: input.title.trim(),
		subject: subject?.name ?? input.title.trim(),
		day: input.day,
		start: input.start,
		end: input.end,
		startsAt,
		endsAt,
		room: '—',
		teacher: 'Non assigné',
	};

	const result = await runMutation(async () => {
		const scheduleId = input.scheduleId ?? `sched-${Date.now().toString(36)}`;
		const createdSchedule = !input.scheduleId;

		try {
			if (createdSchedule) {
				await client.commands.createSchedule({
					id: scheduleId,
					schoolId,
					classGroupId: input.classGroupId,
					scheduleKind: 'lesson',
					title: input.title.trim(),
					isRecurring: false,
					specificDate,
					startTime: input.start,
					endTime: input.end,
					classSubjectId: input.classSubjectId ?? null,
					activityId: null,
					dayOfWeek: null,
					createdAt: new Date().toISOString(),
				});
			}

			const materialized = await client.commands.materializeSchedule({ scheduleId });
			const session = await resolveMaterializedLessonSession(client, scheduleId, specificDate, materialized);
			if (!session) {
				throw new Error(get(t)('planning.createMaterializeError'));
			}
			return session;
		}
		catch (error) {
			if (createdSchedule) {
				try {
					await client.entities.schedules.delete({ id: scheduleId });
				}
				catch {
					// Best-effort cleanup when materialization fails after schedule creation.
				}
			}
			throw error;
		}
	}, {
		successMessage: input.successMessage,
		errorMessage: get(t)('planning.createError'),
		apply: () => {
			detailDataContext.appendPlanningEvent(optimistic);
		},
		rollback: () => {
			detailDataContext.removePlanningEvent(optimisticId);
		},
		onSuccess: (session) => {
			detailDataContext.removePlanningEvent(optimisticId);
			detailDataContext.appendPlanningEvent({
				...optimistic,
				id: session.id,
				kind: 'lesson',
				scheduleId: session.scheduleId,
				startsAt: String(session.startsAt),
				endsAt: String(session.endsAt),
			});
		},
	});
	return result?.id ?? null;
}

export async function updateSessionMutation(input: {
	sessionId: string;
	title: string;
	classSubjectId?: string | null;
	day: PlanningEvent['day'];
	start: string;
	end: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = planningSnapshot(input.sessionId);
	const subject = input.classSubjectId
		? detailDataContext.subjects.find(entry => entry.id === input.classSubjectId)
		: undefined;
	const patch = {
		title: input.title.trim(),
		subject: subject?.name ?? input.title.trim(),
		day: input.day,
		start: input.start,
		end: input.end,
	};

	let existing;
	try {
		existing = await client.entities.lessonSessions.get(input.sessionId);
	}
	catch {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const { startsAt, endsAt } = sessionInstantsForExistingWeek(
		String(existing.startsAt),
		input.day,
		input.start,
		input.end,
	);
	const resolvedPatch = { ...patch, startsAt, endsAt };

	const result = await runMutation(async () => {
		await client.commands.rescheduleOccurrence({
			lessonSessionId: input.sessionId,
			startsAt,
			endsAt,
		});
		await client.entities.lessonSessions.save(
			buildLessonSessionSavePayload(existing, {
				displayLabel: input.title,
				classSubjectId: input.classSubjectId,
			}),
		);
	}, {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchPlanningEvent(input.sessionId, resolvedPatch);
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchPlanningEvent(input.sessionId, previous);
			}
		},
	});
	return result !== null;
}

export async function reschedulePlanningSlotMutation(input: {
	sessionId: string;
	kind: PlanningEvent['kind'];
	scheduleId?: string;
	day: PlanningEvent['day'];
	dayOfWeek: ScheduleDayOfWeek;
	startTime: string;
	endTime: string;
	successMessage?: string;
	errorMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = planningSnapshot(input.sessionId);
	const isActivity = input.kind === 'activity';

	let sessionStartsAt: string;
	try {
		if (isActivity) {
			const session = await client.entities.activitySessions.get(input.sessionId);
			sessionStartsAt = String(session.startsAt);
		}
		else {
			const session = await client.entities.lessonSessions.get(input.sessionId);
			sessionStartsAt = String(session.startsAt);
		}
	}
	catch {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const instants = sessionInstantsForSlot(sessionStartsAt, {
		day: input.day,
		startTime: input.startTime,
		endTime: input.endTime,
	});
	const patch = {
		day: input.day,
		start: input.startTime,
		end: input.endTime,
		startsAt: instants.startsAt.toISOString(),
		endsAt: instants.endsAt.toISOString(),
	};

	const result = await runMutation(async () => {
		if (input.scheduleId) {
			const schedule = await client.entities.schedules.get(input.scheduleId);
			if (!schedule.isRecurring) {
				await client.entities.schedules.save({
					...schedule,
					startTime: input.startTime,
					endTime: input.endTime,
					specificDate: instants.startsAt.toISOString().slice(0, 10),
				});
			}
		}

		await client.commands.rescheduleOccurrence(
			isActivity
				? {
						activitySessionId: input.sessionId,
						startsAt: instants.startsAt.toISOString(),
						endsAt: instants.endsAt.toISOString(),
					}
				: {
						lessonSessionId: input.sessionId,
						startsAt: instants.startsAt.toISOString(),
						endsAt: instants.endsAt.toISOString(),
					},
		);
	}, {
		apply: () => detailDataContext.patchPlanningEvent(input.sessionId, patch),
		rollback: () => {
			if (previous) {
				detailDataContext.patchPlanningEvent(input.sessionId, previous);
			}
		},
		successMessage: input.successMessage,
		errorMessage: input.errorMessage,
	});

	return result !== null;
}

export async function cancelPlanningEventMutation(
	event: Pick<PlanningEvent, 'id' | 'kind' | 'title'>,
	opts?: { successMessage?: string },
): Promise<boolean> {
	if (event.kind !== 'lesson' && event.kind !== 'activity') {
		return false;
	}

	const client = getBrowserSchoolClient();
	const previous = planningSnapshot(event.id);
	const result = await runMutation(async () => {
		if (event.kind === 'activity') {
			await client.commands.cancelActivitySession({ activitySessionId: event.id });
			return;
		}
		await client.commands.cancelLessonSession({ lessonSessionId: event.id });
	}, {
		successMessage: opts?.successMessage,
		apply: () => {
			detailDataContext.patchPlanningEvent(event.id, { status: 'cancelled' });
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchPlanningEvent(event.id, previous);
			}
		},
	});
	return result !== null;
}
