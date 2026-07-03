import type { components } from '$lib/api/schema';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';

type StaffPermissionAssignment = components['schemas']['StaffPermissionAssignment'];

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

function academicYearId(): string {
	return academicContext.yearId;
}

export async function saveStaffPermissionAssignmentMutation(input: {
	assignment: StaffPermissionAssignment;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = detailDataContext.staffPermissionAssignments.find(
		row => row.id === input.assignment.id,
	);

	const result = await runMutation(
		() => client.entities.staffPermissionAssignments.save(input.assignment),
		{
			successMessage: input.successMessage,
			apply: () => {
				detailDataContext.upsertStaffPermissionAssignment({
					...input.assignment,
					scopeLabel: previous?.scopeLabel ?? input.assignment.scopeIds ?? '—',
					tenantWide: (input.assignment.scopeIds ?? '') === '',
					isSynced: Boolean(input.assignment.sourceStaffAssignmentId),
					hasMissingScope: previous?.hasMissingScope ?? false,
				});
			},
			rollback: () => {
				if (previous) {
					detailDataContext.upsertStaffPermissionAssignment(previous);
				}
				else {
					detailDataContext.removeStaffPermissionAssignment(input.assignment.id);
				}
			},
		},
	);

	return result !== null;
}

export async function deleteStaffPermissionAssignmentMutation(input: {
	id: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = detailDataContext.staffPermissionAssignments.find(row => row.id === input.id);
	if (!previous) {
		return false;
	}

	const result = await runMutation(
		() => client.entities.staffPermissionAssignments.delete({ id: input.id }),
		{
			successMessage: input.successMessage,
			apply: () => {
				detailDataContext.removeStaffPermissionAssignment(input.id);
			},
			rollback: () => {
				detailDataContext.upsertStaffPermissionAssignment(previous);
			},
		},
	);

	return result !== null;
}

export function createStaffPermissionAssignmentPayload(input: {
	id: string;
	staffId: string;
	permission: StaffPermissionAssignment['permission'];
	scopeIds?: string;
}): StaffPermissionAssignment {
	return {
		id: input.id,
		staffId: input.staffId,
		schoolId: schoolId(),
		academicYearId: academicYearId(),
		permission: input.permission,
		scopeIds: input.scopeIds ?? '',
		status: 'active',
		sourceStaffAssignmentId: null,
	};
}
