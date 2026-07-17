import type { components } from '$lib/api/schema';
import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';

type StaffPermissionAssignment = components['schemas']['StaffPermissionAssignment'];
type StaffPermissionAssignmentConfigCommand = components['schemas']['StaffPermissionAssignmentConfigCommand'];

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

function academicYearId(): string {
	return academicContext.yearId;
}

function toStaffPermissionConfigCommand(
	assignment: StaffPermissionAssignment,
): StaffPermissionAssignmentConfigCommand {
	return {
		id: assignment.id,
		staffId: assignment.staffId,
		schoolId: assignment.schoolId,
		academicYearId: assignment.academicYearId,
		permission: assignment.permission,
		scopeIds: assignment.scopeIds ?? '',
		status: assignment.status,
		sourceStaffAssignmentId: assignment.sourceStaffAssignmentId ?? null,
	};
}

function applyStaffPermissionAssignment(
	assignment: StaffPermissionAssignment,
	previous?: StaffPermissionAssignmentView,
) {
	detailDataContext.upsertStaffPermissionAssignment({
		...assignment,
		scopeLabel: previous?.scopeLabel ?? assignment.scopeIds ?? '—',
		tenantWide: (assignment.scopeIds ?? '') === '',
		isSynced: Boolean(assignment.sourceStaffAssignmentId),
		hasMissingScope: previous?.hasMissingScope ?? false,
	});
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
		() => client.commands.assignStaffPermission(
			toStaffPermissionConfigCommand(input.assignment),
		),
		{
			successMessage: input.successMessage,
			apply: () => {
				applyStaffPermissionAssignment(input.assignment, previous);
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

	if (result) {
		applyStaffPermissionAssignment(result, previous);
	}

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
