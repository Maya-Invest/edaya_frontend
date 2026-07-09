import type { Activity } from '$lib/types/school';
import { buildActivityConfigCommand, DEFAULT_ACTIVITY_SCHEDULE } from '$lib/api/activity-save-payload';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

function activitySnapshot(activityId: string): Activity | undefined {
	return detailDataContext.activities.find(activity => activity.id === activityId);
}

export async function createActivityMutation(input: {
	name: string;
	category: Activity['category'];
	coach: string;
	capacity: number;
	description: string;
	startDate: string;
	endDate: string;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		toast.error(get(t)('dataState.errorDescription'));
		return null;
	}

	const activityId = `act-${Date.now().toString(36)}`;
	const optimistic: Activity = {
		id: activityId,
		name: input.name.trim(),
		category: input.category,
		coach: input.coach.trim(),
		schedule: DEFAULT_ACTIVITY_SCHEDULE,
		participants: 0,
		capacity: input.capacity,
		description: input.description.trim(),
		startDate: input.startDate,
		endDate: input.endDate,
		enrollments: [],
	};

	const result = await runMutation(() => client.commands.configureActivity(
		buildActivityConfigCommand(null, {
			id: activityId,
			name: input.name,
			category: input.category,
			coach: input.coach,
			capacity: input.capacity,
			description: input.description,
			startDate: input.startDate,
			endDate: input.endDate,
			participants: 0,
			schedule: DEFAULT_ACTIVITY_SCHEDULE,
			createdAt: new Date().toISOString(),
		}),
	), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.appendActivity(optimistic);
		},
		rollback: () => {
			detailDataContext.removeActivity(activityId);
		},
	});

	return result ? activityId : null;
}

export async function updateActivityMutation(input: {
	activityId: string;
	name: string;
	category: Activity['category'];
	coach: string;
	capacity: number;
	description: string;
	startDate: string;
	endDate: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = activitySnapshot(input.activityId);
	let existing;
	try {
		existing = await client.entities.activities.get(input.activityId);
	}
	catch {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const patch = {
		name: input.name.trim(),
		category: input.category,
		coach: input.coach.trim(),
		capacity: input.capacity,
		description: input.description.trim(),
		startDate: input.startDate,
		endDate: input.endDate,
	};

	const result = await runMutation(() => client.commands.configureActivity(
		buildActivityConfigCommand(existing, {
			id: input.activityId,
			name: input.name,
			category: input.category,
			coach: input.coach,
			capacity: input.capacity,
			description: input.description,
			startDate: input.startDate,
			endDate: input.endDate,
		}),
	), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchActivity(input.activityId, patch);
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchActivity(input.activityId, previous);
			}
		},
	});
	return result !== null;
}
