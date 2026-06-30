import type { ScheduleDayOfWeek } from '$lib/components/school/scheduling/planning-calendar';
import type { PlanningEvent } from '$lib/types/school';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { buildSessionSavePayload } from '$lib/api/session-save-payload';
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
	const id = `sess-${Date.now().toString(36)}`;
	const { startsAt, endsAt } = sessionInstantsForWeek(input.weekStart, input.day, input.start, input.end);
	const subject = input.classSubjectId
		? detailDataContext.subjects.find(entry => entry.id === input.classSubjectId)
		: undefined;
	const optimistic: PlanningEvent = {
		id,
		classId: input.classGroupId,
		scheduleId: input.scheduleId,
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

	const result = await runMutation(() => client.commands.createSession({
		id,
		classGroupId: input.classGroupId,
		title: input.title.trim(),
		kind: 'course',
		startsAt,
		endsAt,
		classSubjectId: input.classSubjectId ?? null,
		scheduleId: input.scheduleId ?? null,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.appendPlanningEvent(optimistic);
		},
		rollback: () => {
			detailDataContext.removePlanningEvent(id);
		},
	});
	return result ? id : null;
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
		existing = await client.entities.sessions.get(input.sessionId);
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

	const result = await runMutation(() => client.entities.sessions.save(
		buildSessionSavePayload(existing, {
			title: input.title,
			classSubjectId: input.classSubjectId,
			startsAt,
			endsAt,
		}),
	), {
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
	let session;
	try {
		session = await client.entities.sessions.get(input.sessionId);
	}
	catch {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const instants = sessionInstantsForSlot(String(session.startsAt), {
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
			await client.entities.schedules.save({
				...schedule,
				isRecurring: true,
				dayOfWeek: input.dayOfWeek,
				startTime: input.startTime,
				endTime: input.endTime,
			});
		}

		await client.entities.sessions.save({
			...session,
			startsAt: instants.startsAt.toISOString(),
			endsAt: instants.endsAt.toISOString(),
		});
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
