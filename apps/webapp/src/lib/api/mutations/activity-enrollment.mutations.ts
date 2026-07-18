import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export async function enrollStudentInActivityMutation(input: {
	activityId: string;
	studentId: string;
	status: 'approved' | 'pending' | 'denied';
	enrollmentId?: string;
	createdAt?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = input.enrollmentId ?? `ae-${Date.now().toString(36)}`;
	const createdAt = input.createdAt ?? new Date().toISOString();

	const result = await runMutation(
		() => client.commands.enrollStudentInActivity({
			id,
			activityId: input.activityId,
			studentId: input.studentId,
			status: input.status,
			createdAt,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['activities'],
		},
	);

	return result !== null;
}

export async function removeActivityEnrollmentMutation(input: {
	activityId: string;
	enrollmentId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runMutation(
		() => client.entities.activityEnrollments.delete({ id: input.enrollmentId }),
		{
			successMessage: input.successMessage,
			versionKeys: ['activities'],
		},
	);

	return result !== null;
}
