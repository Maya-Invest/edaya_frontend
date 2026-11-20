import type { components } from '$lib/api/schema';
import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

type StaffPermissionAssignmentConfigCommand = components['schemas']['StaffPermissionAssignmentConfigCommand'];

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

function academicYearId(): string {
	return academicContext.yearId;
}

function toStaffPermissionConfigCommand(
	assignment: StaffPermissionAssignmentView,
): StaffPermissionAssignmentConfigCommand {
	return {
		id: assignment.id,
		staffId: assignment.staffId,
		schoolId: assignment.schoolId,
		academicYearId: assignment.academicYearId,
		permission: assignment.permission,
		customScopes: assignment.customScopes ?? assignment.scopes.filter(scope => scope.kind !== 'school'),
		useDefaultScopes: assignment.useDefaultScopes ?? false,
		startsAt: assignment.startsAt,
		endsAt: assignment.endsAt,
		status: assignment.status,
	};
}

export async function saveStaffPermissionAssignmentMutation(input: {
	assignment: StaffPermissionAssignmentView;
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
		() => client.commands.removeStaffPermission({ assignmentId: input.id }),
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
	permission: StaffPermissionAssignmentView['permission'];
	scopes: StaffPermissionAssignmentView['scopes'];
	customScopes?: StaffPermissionAssignmentView['scopes'];
	useDefaultScopes?: boolean;
}): StaffPermissionAssignmentView {
	return {
		id: input.id,
		staffId: input.staffId,
		schoolId: schoolId(),
		academicYearId: academicYearId(),
		permission: input.permission,
		scopes: input.scopes,
		customScopes: (input.customScopes ?? input.scopes).filter(scope => scope.kind !== 'school'),
		useDefaultScopes: input.useDefaultScopes ?? true,
		scopeLabel: '—',
		renderedScopes: [],
		tenantWide: false,
		hasMissingScope: false,
		status: 'active',
	};
}
