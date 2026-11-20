import type { PlanningEvent, TimetableSchedule } from '$lib/types/school';
import { classGroupScope } from '$lib/api/entity-list-filters';
import { ensureClassActivityEnrollment } from '$lib/api/mutations/class-activity-enrollment.mutations';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import {
	PLANNING_DAY_TO_SCHEDULE,
} from '$lib/scheduling/planning-calendar';
import { get } from 'svelte/store';

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
	isRecurring?: boolean;
	specificDate?: string;
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
		isRecurring: input.isRecurring ?? true,
		dayOfWeek: input.isRecurring === false ? null : PLANNING_DAY_TO_SCHEDULE[input.day],
		startTime: input.startTime,
		endTime: input.endTime,
		classSubjectId: scheduleKind === 'lesson' ? (input.classSubjectId ?? null) : null,
		activityId: scheduleKind === 'activity' ? (input.activityId ?? null) : null,
		specificDate: input.isRecurring === false ? input.specificDate ?? null : null,
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

	await client.commands.materializeSchedule({ scheduleId: id });

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
	isRecurring?: boolean;
	specificDate?: string;
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

	const isRecurring = input.isRecurring ?? existing.isRecurring;
	const result = await runMutation(() => client.commands.saveSchedule({
		schedule: {
			...existing,
			title: input.title.trim(),
			isRecurring,
			specificDate: isRecurring ? null : input.specificDate ?? existing.specificDate ?? null,
			dayOfWeek: isRecurring ? PLANNING_DAY_TO_SCHEDULE[input.day] : null,
			startTime: input.startTime,
			endTime: input.endTime,
			classSubjectId: input.scheduleKind === 'lesson' ? (input.classSubjectId ?? null) : null,
			activityId: input.scheduleKind === 'activity' ? (input.activityId ?? null) : null,
		},
		materialize: true,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['planning'],
	});

	if (!result) {
		return false;
	}

	return true;
}

export async function generateSessionsMutation(input: {
	classGroupId: string;
	weekStart: Date;
	isRecurring?: boolean;
	specificDate?: string;
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
