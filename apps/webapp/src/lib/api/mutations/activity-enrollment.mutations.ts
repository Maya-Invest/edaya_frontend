import type { components } from '$lib/api/schema';
import type { ActivityEnrollment, ActivityEnrollmentStatus } from '$lib/types/school';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { detailDataContext } from '$lib/detail-data/context.svelte';

type ActivityEnrollmentRaw = components['schemas']['ActivityEnrollment'];

const ENROLLMENT_STATUS_TO_UI: Record<string, ActivityEnrollmentStatus> = {
	approved: 'approved',
	pending: 'pending',
	denied: 'denied',
};

function mapEnrollment(raw: ActivityEnrollmentRaw): ActivityEnrollment {
	return {
		id: raw.id,
		studentId: raw.studentId,
		status: ENROLLMENT_STATUS_TO_UI[raw.status] ?? 'pending',
	};
}

function activityEnrollments(activityId: string): ActivityEnrollment[] {
	return detailDataContext.activities.find(activity => activity.id === activityId)?.enrollments ?? [];
}

function replaceActivityEnrollments(activityId: string, enrollments: ActivityEnrollment[]) {
	detailDataContext.patchActivity(activityId, { enrollments });
}

export async function enrollStudentInActivityMutation(input: {
	activityId: string;
	studentId: string;
	status: ActivityEnrollmentStatus;
	enrollmentId?: string;
	createdAt?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = activityEnrollments(input.activityId);
	const existing = previous.find(enrollment => enrollment.studentId === input.studentId);
	const id = input.enrollmentId ?? existing?.id ?? `ae-${Date.now().toString(36)}`;
	const createdAt = input.createdAt ?? (existing ? undefined : new Date().toISOString());
	const optimistic: ActivityEnrollment = {
		id,
		studentId: input.studentId,
		status: input.status,
	};

	const result = await runMutation(
		() => client.commands.enrollStudentInActivity({
			id,
			activityId: input.activityId,
			studentId: input.studentId,
			status: input.status,
			...(createdAt ? { createdAt } : {}),
		}),
		{
			successMessage: input.successMessage,
			apply: () => {
				const next = previous.filter(enrollment => enrollment.studentId !== input.studentId);
				replaceActivityEnrollments(input.activityId, [...next, optimistic]);
			},
			rollback: () => {
				replaceActivityEnrollments(input.activityId, previous);
			},
		},
	);

	if (result) {
		const next = previous.filter(enrollment => enrollment.studentId !== input.studentId);
		replaceActivityEnrollments(input.activityId, [...next, mapEnrollment(result)]);
	}

	return result !== null;
}

export async function removeActivityEnrollmentMutation(input: {
	activityId: string;
	enrollmentId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = activityEnrollments(input.activityId);
	const removed = previous.find(enrollment => enrollment.id === input.enrollmentId);
	if (!removed) {
		return false;
	}

	const result = await runMutation(
		() => client.entities.activityEnrollments.delete({ id: input.enrollmentId }),
		{
			successMessage: input.successMessage,
			apply: () => {
				replaceActivityEnrollments(
					input.activityId,
					previous.filter(enrollment => enrollment.id !== input.enrollmentId),
				);
			},
			rollback: () => {
				replaceActivityEnrollments(input.activityId, previous);
			},
		},
	);

	return result !== null;
}
