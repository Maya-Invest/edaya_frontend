import type { components } from '$lib/api/schema';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

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
		scopes: assignment.scopes,
		startsAt: assignment.startsAt,
		endsAt: assignment.endsAt,
		status: assignment.status,
	};
}

export async function saveStaffPermissionAssignmentMutation(input: {
	assignment: StaffPermissionAssignment;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runMutation(
		() => client.commands.assignStaffPermission(
			toStaffPermissionConfigCommand(input.assignment),
		),
		{
			successMessage: input.successMessage,
			versionKeys: ['staff'],
		},
	);

	return result !== null;
}

export async function deleteStaffPermissionAssignmentMutation(input: {
	id: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runMutation(
		() => client.entities.staffPermissionAssignments.delete({ id: input.id }),
		{
			successMessage: input.successMessage,
			versionKeys: ['staff'],
		},
	);

	return result !== null;
}

export function createStaffPermissionAssignmentPayload(input: {
	id: string;
	staffId: string;
	permission: StaffPermissionAssignment['permission'];
	scopes: StaffPermissionAssignment['scopes'];
}): StaffPermissionAssignment {
	return {
		id: input.id,
		staffId: input.staffId,
		schoolId: schoolId(),
		academicYearId: academicYearId(),
		permission: input.permission,
		scopes: input.scopes,
		status: 'active',
	};
}
