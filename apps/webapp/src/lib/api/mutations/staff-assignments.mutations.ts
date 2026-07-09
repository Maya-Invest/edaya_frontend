import type { components } from '$lib/api/schema';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { detailDataContext } from '$lib/detail-data/context.svelte';

type StaffAssignment = components['schemas']['StaffAssignment'];

export async function saveStaffAssignmentMutation(input: {
	assignment: StaffAssignment;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = detailDataContext.staffAssignments.find(row => row.id === input.assignment.id);

	const result = await runMutation(
		() => client.entities.staffAssignments.save(input.assignment),
		{
			successMessage: input.successMessage,
			apply: () => {
				detailDataContext.upsertStaffAssignment(input.assignment);
			},
			rollback: () => {
				if (previous) {
					detailDataContext.upsertStaffAssignment(previous);
				}
				else {
					detailDataContext.removeStaffAssignment(input.assignment.id);
				}
			},
		},
	);

	return result !== null;
}

export async function deleteStaffAssignmentMutation(input: {
	id: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = detailDataContext.staffAssignments.find(row => row.id === input.id);
	if (!previous) {
		return false;
	}

	const result = await runMutation(
		() => client.entities.staffAssignments.delete({ id: input.id }),
		{
			successMessage: input.successMessage,
			apply: () => {
				detailDataContext.removeStaffAssignment(input.id);
			},
			rollback: () => {
				detailDataContext.upsertStaffAssignment(previous);
			},
		},
	);

	return result !== null;
}

export function createStaffAssignmentPayload(input: {
	id: string;
	staffId: string;
	responsibility: string;
	permissions: StaffAssignment['permissions'];
	classGroupId?: string;
	classSubjectId?: string;
}): StaffAssignment {
	return {
		id: input.id,
		staffId: input.staffId,
		academicYearId: academicContext.yearId,
		responsibility: input.responsibility,
		permissions: [...input.permissions],
		classGroupId: input.classGroupId ?? null,
		classSubjectId: input.classSubjectId ?? null,
		lessonSessionId: null,
		activitySessionId: null,
		assessmentId: null,
	};
}
