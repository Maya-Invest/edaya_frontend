import type { PlanningEvent, TimetableSchedule } from '$lib/types/school';
import { classGroupScope } from '$lib/api/entity-list-filters';
import { ensureClassActivityEnrollment } from '$lib/api/mutations/class-activity-enrollment.mutations';
import { createSessionMutation, updateSessionMutation } from '$lib/api/mutations/planning.mutations';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { loadClassPlanning } from '$lib/api/planning-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import {
	filterPlanningEventsForWeek,
	PLANNING_DAY_TO_SCHEDULE,
} from '$lib/scheduling/planning-calendar';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

async function syncActivityScheduleForWeek(input: {
	scheduleId: string;
	classGroupId: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	await client.commands.materializeSchedule({ scheduleId: input.scheduleId });
	return true;
}

async function syncLessonScheduleForWeek(input: {
	scheduleId: string;
	classGroupId: string;
	weekStart: Date;
	title: string;
	classSubjectId?: string | null;
	day: PlanningEvent['day'];
	startTime: string;
	endTime: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const planning = await loadClassPlanning(client, input.classGroupId);
	const weekEvents = filterPlanningEventsForWeek(planning, input.weekStart);
	const existing = weekEvents.find(event => event.scheduleId === input.scheduleId && event.kind === 'lesson');

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

async function syncScheduleSessionForWeek(input: {
	scheduleId: string;
	scheduleKind: TimetableSchedule['scheduleKind'];
	classGroupId: string;
	weekStart: Date;
	title: string;
	classSubjectId?: string | null;
	activityId?: string | null;
	day: PlanningEvent['day'];
	startTime: string;
	endTime: string;
}): Promise<boolean> {
	if (input.scheduleKind === 'activity') {
		return syncActivityScheduleForWeek({
			scheduleId: input.scheduleId,
			classGroupId: input.classGroupId,
		});
	}

	return syncLessonScheduleForWeek(input);
}

export async function createScheduleMutation(input: {
	classGroupId: string;
	scheduleKind?: TimetableSchedule['scheduleKind'];
	title: string;
	classSubjectId?: string;
	activityId?: string;
	day: PlanningEvent['day'];
	startTime: string;
	endTime: string;
	weekStart: Date;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const scheduleKind = input.scheduleKind ?? 'lesson';
	const id = `sched-${Date.now().toString(36)}`;

	const result = await runMutation(() => client.commands.createSchedule({
		id,
		schoolId: authSession.schoolId!,
		classGroupId: input.classGroupId,
		scheduleKind,
		title: input.title.trim(),
		isRecurring: true,
		dayOfWeek: PLANNING_DAY_TO_SCHEDULE[input.day],
		startTime: input.startTime,
		endTime: input.endTime,
		classSubjectId: scheduleKind === 'lesson' ? (input.classSubjectId ?? null) : null,
		activityId: scheduleKind === 'activity' ? (input.activityId ?? null) : null,
		specificDate: null,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		versionKeys: ['planning'],
	});

	if (!result) {
		return null;
	}

	if (scheduleKind === 'activity' && input.activityId) {
		await ensureClassActivityEnrollment({
			activityId: input.activityId,
			classGroupId: input.classGroupId,
		});
	}

	const synced = await syncScheduleSessionForWeek({
		scheduleId: id,
		scheduleKind,
		classGroupId: input.classGroupId,
		weekStart: input.weekStart,
		title: input.title,
		classSubjectId: input.classSubjectId,
		activityId: input.activityId,
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
	scheduleKind: TimetableSchedule['scheduleKind'];
	title: string;
	classSubjectId?: string | null;
	activityId?: string | null;
	day: PlanningEvent['day'];
	startTime: string;
	endTime: string;
	weekStart: Date;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	let existing;
	try {
		existing = await client.entities.schedules.get(input.scheduleId);
	}
	catch {
		return false;
	}

	const result = await runMutation(() => client.commands.saveSchedule({
		schedule: {
			...existing,
			title: input.title.trim(),
			isRecurring: true,
			dayOfWeek: PLANNING_DAY_TO_SCHEDULE[input.day],
			startTime: input.startTime,
			endTime: input.endTime,
			classSubjectId: input.scheduleKind === 'lesson' ? (input.classSubjectId ?? null) : null,
			activityId: input.scheduleKind === 'activity' ? (input.activityId ?? null) : null,
		},
		materialize: false,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['planning'],
	});

	if (!result) {
		return false;
	}

	const synced = await syncScheduleSessionForWeek({
		scheduleId: input.scheduleId,
		scheduleKind: input.scheduleKind,
		classGroupId: input.classGroupId,
		weekStart: input.weekStart,
		title: input.title,
		classSubjectId: input.classSubjectId,
		activityId: input.activityId,
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
	const schedules = await client.entities.schedules.list(classGroupScope(input.classGroupId));

	const result = await runMutation(async () => {
		for (const schedule of schedules ?? []) {
			await client.commands.materializeSchedule({ scheduleId: schedule.id });
		}
	}, {
		successMessage: input.successMessage,
		versionKeys: ['planning'],
	});

	return result !== null;
}

export async function deleteScheduleMutation(
	scheduleId: string,
	opts?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	let existing;
	try {
		existing = await client.entities.schedules.get(scheduleId);
	}
	catch {
		return false;
	}

	const result = await runMutation(() => client.entities.schedules.delete({ id: scheduleId }), {
		successMessage: opts?.successMessage ?? get(t)('planning.schedule.toastDeleted', { title: existing.title }),
		versionKeys: ['planning'],
	});

	return result !== null;
}
