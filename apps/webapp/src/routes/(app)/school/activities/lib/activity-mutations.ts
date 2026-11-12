import type { Activity, ActivityEnrollment, ActivityEnrollmentStatus, ClassActivityEnrollment } from '$lib/types/school';
import type { ActivitiesPageState } from '../activities-page.svelte';
import { buildActivityConfigCommand, DEFAULT_ACTIVITY_SCHEDULE } from '$lib/api/activity-save-payload';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { runActivityRouteMutation } from './activity-route-mutation';

export async function createActivityOnPage(
	state: ActivitiesPageState,
	input: {
		name: string;
		shortName?: string;
		category: Activity['category'];
		coach: string;
		capacity: number;
		description: string;
		startDate: string;
		endDate: string;
		schedule?: string;
		successMessage?: string;
	},
): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		return null;
	}

	const activityId = `act-${Date.now().toString(36)}`;
	const schedule = input.schedule?.trim() || DEFAULT_ACTIVITY_SCHEDULE;
	const optimistic: Activity = {
		id: activityId,
		name: input.name.trim(),
		shortName: input.shortName,
		category: input.category,
		coach: input.coach.trim(),
		schedule,
		participants: 0,
		capacity: input.capacity,
		description: input.description.trim(),
		startDate: input.startDate,
		endDate: input.endDate,
		enrollments: [],
		classEnrollments: [],
	};

	const result = await runActivityRouteMutation({
		request: () => client.commands.configureActivity(
			buildActivityConfigCommand(null, {
				id: activityId,
				name: input.name,
				shortName: input.shortName,
				category: input.category,
				coach: input.coach,
				capacity: input.capacity,
				description: input.description,
				startDate: input.startDate,
				endDate: input.endDate,
				participants: 0,
				schedule,
				createdAt: new Date().toISOString(),
			}),
		),
		successMessage: input.successMessage,
		apply: () => {
			state.appendActivity(optimistic);
		},
		rollback: () => {
			state.removeActivity(activityId);
		},
	});

	return result ? activityId : null;
}

export async function updateActivityOnPage(
	state: ActivitiesPageState,
	input: {
		activityId: string;
		name: string;
		shortName?: string;
		category: Activity['category'];
		coach: string;
		capacity: number;
		description: string;
		startDate: string;
		endDate: string;
		schedule?: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findActivity(input.activityId);
	if (!previous) {
		return false;
	}

	let existing;
	try {
		existing = await client.entities.activities.get(input.activityId);
	}
	catch {
		return false;
	}

	const schedule = input.schedule?.trim() || previous.schedule || DEFAULT_ACTIVITY_SCHEDULE;
	const patch = {
		name: input.name.trim(),
		shortName: input.shortName,
		category: input.category,
		coach: input.coach.trim(),
		capacity: input.capacity,
		description: input.description.trim(),
		startDate: input.startDate,
		endDate: input.endDate,
		schedule,
	};

	const result = await runActivityRouteMutation({
		request: () => client.commands.configureActivity(
			buildActivityConfigCommand(existing, {
				id: input.activityId,
				name: input.name,
				shortName: input.shortName,
				category: input.category,
				coach: input.coach,
				capacity: input.capacity,
				description: input.description,
				startDate: input.startDate,
				endDate: input.endDate,
				schedule,
			}),
		),
		successMessage: input.successMessage,
		apply: () => {
			state.patchActivity(input.activityId, patch);
		},
		rollback: () => {
			state.patchActivity(input.activityId, previous);
		},
	});

	return result !== null;
}

export async function deleteActivityOnPage(
	state: ActivitiesPageState,
	activityId: string,
	opts?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findActivity(activityId);
	if (!previous) {
		return false;
	}

	const result = await runActivityRouteMutation({
		request: () => client.entities.activities.delete({ id: activityId }),
		successMessage: opts?.successMessage,
		apply: () => {
			state.removeActivity(activityId);
		},
		rollback: () => {
			state.appendActivity(previous);
		},
	});

	return result !== null;
}

export async function enrollStudentInActivityOnPage(
	state: ActivitiesPageState,
	input: {
		activityId: string;
		studentId: string;
		status: ActivityEnrollmentStatus;
		enrollmentId?: string;
		createdAt?: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const activity = state.findActivity(input.activityId);
	if (!activity) {
		return false;
	}

	const previous = activity.enrollments;
	const existing = previous.find(enrollment => enrollment.studentId === input.studentId);
	const id = input.enrollmentId ?? existing?.id ?? `ae-${Date.now().toString(36)}`;
	const createdAt = input.createdAt ?? (existing ? undefined : new Date().toISOString());
	const optimistic: ActivityEnrollment = {
		id,
		studentId: input.studentId,
		status: input.status,
	};

	const result = await runActivityRouteMutation({
		request: () => client.commands.enrollStudentInActivity({
			id,
			activityId: input.activityId,
			studentId: input.studentId,
			status: input.status,
			...(createdAt ? { createdAt } : {}),
		}),
		successMessage: input.successMessage,
		apply: () => {
			const next = previous.filter(enrollment => enrollment.studentId !== input.studentId);
			state.patchActivity(input.activityId, { enrollments: [...next, optimistic] });
		},
		rollback: () => {
			state.patchActivity(input.activityId, { enrollments: previous });
		},
	});

	if (result) {
		const next = previous.filter(enrollment => enrollment.studentId !== input.studentId);
		state.patchActivity(input.activityId, {
			enrollments: [...next, {
				id: result.id,
				studentId: result.studentId,
				status: result.status as ActivityEnrollmentStatus,
			}],
		});
	}

	return result !== null;
}

export async function removeActivityEnrollmentOnPage(
	state: ActivitiesPageState,
	input: {
		activityId: string;
		enrollmentId: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const activity = state.findActivity(input.activityId);
	if (!activity) {
		return false;
	}

	const previous = activity.enrollments;
	const removed = previous.find(enrollment => enrollment.id === input.enrollmentId);
	if (!removed) {
		return false;
	}

	const result = await runActivityRouteMutation({
		request: () => client.entities.activityEnrollments.delete({ id: input.enrollmentId }),
		successMessage: input.successMessage,
		apply: () => {
			state.patchActivity(input.activityId, {
				enrollments: previous.filter(enrollment => enrollment.id !== input.enrollmentId),
			});
		},
		rollback: () => {
			state.patchActivity(input.activityId, { enrollments: previous });
		},
	});

	return result !== null;
}

export async function ensureClassActivityEnrollmentOnPage(
	state: ActivitiesPageState,
	input: {
		activityId: string;
		classGroupId: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const activity = state.findActivity(input.activityId);
	if (!activity) {
		return false;
	}

	const previous = activity.classEnrollments;
	if (previous.some(enrollment => enrollment.classGroupId === input.classGroupId)) {
		return true;
	}

	const id = `cae-${input.activityId}-${input.classGroupId}`;
	const optimistic: ClassActivityEnrollment = {
		id,
		classGroupId: input.classGroupId,
	};

	const result = await runActivityRouteMutation({
		request: () => client.entities.classActivityEnrollments.save({
			id,
			activityId: input.activityId,
			classGroupId: input.classGroupId,
			createdAt: new Date().toISOString(),
		}),
		successMessage: input.successMessage,
		apply: () => {
			state.patchActivity(input.activityId, {
				classEnrollments: [...previous, optimistic],
			});
		},
		rollback: () => {
			state.patchActivity(input.activityId, { classEnrollments: previous });
		},
	});

	if (result) {
		state.patchActivity(input.activityId, {
			classEnrollments: [...previous.filter(row => row.classGroupId !== input.classGroupId), {
				id: result.id,
				classGroupId: result.classGroupId,
			}],
		});
	}

	return result !== null;
}

export async function removeClassActivityEnrollmentOnPage(
	state: ActivitiesPageState,
	input: {
		activityId: string;
		enrollmentId: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const activity = state.findActivity(input.activityId);
	if (!activity) {
		return false;
	}

	const previous = activity.classEnrollments;
	const removed = previous.find(enrollment => enrollment.id === input.enrollmentId);
	if (!removed) {
		return false;
	}

	const result = await runActivityRouteMutation({
		request: () => client.entities.classActivityEnrollments.delete({ id: input.enrollmentId }),
		successMessage: input.successMessage,
		apply: () => {
			state.patchActivity(input.activityId, {
				classEnrollments: previous.filter(enrollment => enrollment.id !== input.enrollmentId),
			});
		},
		rollback: () => {
			state.patchActivity(input.activityId, { classEnrollments: previous });
		},
	});

	return result !== null;
}
