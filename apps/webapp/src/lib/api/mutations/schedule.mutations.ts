import type { PlanningEvent, TimetableSchedule } from '$lib/types/school';
import { createSessionMutation, updateSessionMutation } from '$lib/api/mutations/planning.mutations';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { loadClassPlanning } from '$lib/api/planning-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import {
	filterPlanningEventsForWeek,
	PLANNING_DAY_TO_SCHEDULE,
	weekGenerationRange,
} from '$lib/components/school/scheduling/planning-calendar';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

function scheduleSnapshot(scheduleId: string): TimetableSchedule | undefined {
	return detailDataContext.schedules.find(schedule => schedule.id === scheduleId);
}

async function syncScheduleSessionForWeek(input: {
	scheduleId: string;
	classGroupId: string;
	weekStart: Date;
	title: string;
	classSubjectId?: string | null;
	day: PlanningEvent['day'];
	startTime: string;
	endTime: string;
}): Promise<boolean> {
	const weekEvents = filterPlanningEventsForWeek(
		detailDataContext.planningForClass(input.classGroupId),
		input.weekStart,
	);
	const existing = weekEvents.find(event => event.scheduleId === input.scheduleId);

	if (existing) {
		return updateSessionMutation({
			sessionId: existing.id,
			title: input.title,
			classSubjectId: input.classSubjectId,
			day: input.day,
			start: input.startTime,
			end: input.endTime,
		});
	}

	const sessionId = await createSessionMutation({
		classGroupId: input.classGroupId,
		scheduleId: input.scheduleId,
		title: input.title,
		classSubjectId: input.classSubjectId ?? undefined,
		weekStart: input.weekStart,
		day: input.day,
		start: input.startTime,
		end: input.endTime,
	});
	return sessionId !== null;
}

export async function createScheduleMutation(input: {
	classGroupId: string;
	title: string;
	classSubjectId?: string;
	day: PlanningEvent['day'];
	startTime: string;
	endTime: string;
	weekStart: Date;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const id = `sched-${Date.now().toString(36)}`;
	const subject = input.classSubjectId
		? detailDataContext.subjects.find(entry => entry.id === input.classSubjectId)
		: undefined;
	const optimistic: TimetableSchedule = {
		id,
		classId: input.classGroupId,
		classSubjectId: input.classSubjectId,
		title: input.title.trim(),
		isRecurring: true,
		dayOfWeek: PLANNING_DAY_TO_SCHEDULE[input.day],
		day: input.day,
		startTime: input.startTime,
		endTime: input.endTime,
		subject: subject?.name ?? input.title.trim(),
	};

	const result = await runMutation(() => client.commands.createSchedule({
		id,
		classGroupId: input.classGroupId,
		title: input.title.trim(),
		isRecurring: true,
		dayOfWeek: PLANNING_DAY_TO_SCHEDULE[input.day],
		startTime: input.startTime,
		endTime: input.endTime,
		classSubjectId: input.classSubjectId ?? null,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.appendSchedule(optimistic);
		},
		rollback: () => {
			detailDataContext.removeSchedule(id);
		},
	});

	if (!result) {
		return null;
	}

	const synced = await syncScheduleSessionForWeek({
		scheduleId: id,
		classGroupId: input.classGroupId,
		weekStart: input.weekStart,
		title: input.title,
		classSubjectId: input.classSubjectId,
		day: input.day,
		startTime: input.startTime,
		endTime: input.endTime,
	});
	if (!synced) {
		toast.error(get(t)('planning.schedule.syncError'));
	}

	return id;
}

export async function updateScheduleMutation(input: {
	scheduleId: string;
	classGroupId: string;
	title: string;
	classSubjectId?: string | null;
	day: PlanningEvent['day'];
	startTime: string;
	endTime: string;
	weekStart: Date;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = scheduleSnapshot(input.scheduleId);
	const subject = input.classSubjectId
		? detailDataContext.subjects.find(entry => entry.id === input.classSubjectId)
		: undefined;
	const patch = {
		title: input.title.trim(),
		classSubjectId: input.classSubjectId ?? undefined,
		dayOfWeek: PLANNING_DAY_TO_SCHEDULE[input.day],
		day: input.day,
		startTime: input.startTime,
		endTime: input.endTime,
		subject: subject?.name ?? input.title.trim(),
	};

	let existing;
	try {
		existing = await client.entities.schedules.get(input.scheduleId);
	}
	catch {
		return false;
	}

	const result = await runMutation(() => client.entities.schedules.save({
		...existing,
		title: input.title.trim(),
		isRecurring: true,
		dayOfWeek: PLANNING_DAY_TO_SCHEDULE[input.day],
		startTime: input.startTime,
		endTime: input.endTime,
		classSubjectId: input.classSubjectId ?? null,
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchSchedule(input.scheduleId, patch);
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchSchedule(input.scheduleId, previous);
			}
		},
	});

	if (!result) {
		return false;
	}

	const synced = await syncScheduleSessionForWeek({
		scheduleId: input.scheduleId,
		classGroupId: input.classGroupId,
		weekStart: input.weekStart,
		title: input.title,
		classSubjectId: input.classSubjectId,
		day: input.day,
		startTime: input.startTime,
		endTime: input.endTime,
	});
	if (!synced) {
		toast.error(get(t)('planning.schedule.syncError'));
	}

	return true;
}

export async function generateSessionsMutation(input: {
	classGroupId: string;
	weekStart: Date;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const { startDate, endDate } = weekGenerationRange(input.weekStart);

	const result = await runMutation(() => client.commands.generateSessions({
		classGroupId: input.classGroupId,
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
	}), {
		successMessage: input.successMessage,
		onSuccess: async () => {
			const planning = await loadClassPlanning(client, input.classGroupId);
			detailDataContext.seedPlanning(planning, { classId: input.classGroupId });
		},
	});

	return result !== null;
}

export async function deleteScheduleMutation(
	scheduleId: string,
	opts?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = scheduleSnapshot(scheduleId);
	if (!previous) {
		return false;
	}

	const result = await runMutation(() => client.entities.schedules.delete({ id: scheduleId }), {
		successMessage: opts?.successMessage ?? get(t)('planning.schedule.toastDeleted', { title: previous.title }),
		apply: () => {
			detailDataContext.removeSchedule(scheduleId);
		},
		rollback: () => {
			detailDataContext.appendSchedule(previous);
		},
	});

	return result !== null;
}
