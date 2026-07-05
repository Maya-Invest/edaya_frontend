import type { SessionAttendanceStatus } from '$lib/types/session-detail';
import { classActivityEnrollmentForActivityClass } from '$lib/api/entity-list-filters';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export async function ensureClassActivityEnrollment(input: {
	activityId: string;
	classGroupId: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const existing = await client.entities.classActivityEnrollments.list(
		classActivityEnrollmentForActivityClass(input.activityId, input.classGroupId),
	);
	if ((existing ?? []).length > 0) {
		return true;
	}

	const id = `cae-${input.activityId}-${input.classGroupId}`;
	const result = await runMutation(() => client.entities.classActivityEnrollments.save({
		id,
		activityId: input.activityId,
		classGroupId: input.classGroupId,
		createdAt: new Date().toISOString(),
	}), {
		errorMessage: 'Impossible de lier l\'activité à la classe.',
	});
	return result !== null;
}
