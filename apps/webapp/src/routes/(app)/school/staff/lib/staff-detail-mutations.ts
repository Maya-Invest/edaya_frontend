import type { components } from '$lib/api/schema';
import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
import type { StaffMember } from '$lib/types/school';
import type { StaffPageState } from '../staff-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import {
	createStaffPermissionAssignmentPayload,
} from '$lib/api/mutations/staff-permission-assignments.mutations';
import { uploadProfilePhoto, withPhotoCacheBust } from '$lib/api/profile-photo-upload';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { runStaffRouteMutation } from './staff-route-mutation';

type StaffPermissionAssignment = components['schemas']['StaffPermissionAssignment'];
type StaffPermissionAssignmentConfigCommand = components['schemas']['StaffPermissionAssignmentConfigCommand'];

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? 'sch-edaya-central';
}

function staffInitials(firstName: string, lastName: string): string {
	return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
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

function buildOptimisticStaff(input: {
	id: string;
	firstName: string;
	lastName: string;
	email?: string;
}): StaffMember {
	const email = input.email?.trim() ?? '';
	return {
		id: input.id,
		name: `${input.firstName.trim()} ${input.lastName.trim()}`,
		initials: staffInitials(input.firstName, input.lastName),
		role: 'professeur',
		department: '—',
		email,
		classes: [],
		isActive: true,
		subjectId: null,
		photoUrl: null,
	};
}

export async function createStaffOnPage(
	state: StaffPageState,
	input: {
		firstName: string;
		lastName: string;
		code?: string;
		email?: string;
		sendAccountInvitation?: boolean;
		successMessage?: string;
	},
): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const id = `stf-${Date.now().toString(36)}`;
	const email = input.email?.trim() ?? '';
	const code = input.code?.trim() ?? '';
	const optimistic = buildOptimisticStaff({ id, ...input });

	const result = await runStaffRouteMutation({
		request: () => client.commands.registerStaffMember({
			id,
			schoolId: schoolId(),
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			code: code || null,
			email: email || null,
			accountKind: 'human',
			isActive: true,
			serviceElevated: false,
			sendAccountInvitation: input.sendAccountInvitation ?? true,
			createdAt: new Date().toISOString(),
		}),
		apply: () => {
			state.appendStaff(optimistic);
		},
		rollback: () => {
			state.removeStaff(id);
		},
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});

	return result ? id : null;
}

export async function updateStaffProfileOnPage(
	state: StaffPageState,
	input: {
		staffId: string;
		firstName: string;
		lastName: string;
		email?: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findStaff(input.staffId);
	const email = input.email?.trim() ?? '';
	const nextName = `${input.firstName.trim()} ${input.lastName.trim()}`;

	const result = await runStaffRouteMutation({
		request: () => client.commands.updateStaffMemberProfile({
			staffId: input.staffId,
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			email: email || null,
		}),
		apply: () => {
			state.patchStaff(input.staffId, {
				name: nextName,
				initials: staffInitials(input.firstName, input.lastName),
				email,
			});
		},
		rollback: () => {
			if (previous) {
				state.patchStaff(input.staffId, previous);
			}
		},
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});

	return result !== null;
}

export async function updateStaffStatusOnPage(
	state: StaffPageState,
	input: {
		staffId: string;
		isActive: boolean;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findStaff(input.staffId);

	const result = await runStaffRouteMutation({
		request: () => client.commands.updateStaffMemberStatus({
			staffId: input.staffId,
			isActive: input.isActive,
		}),
		apply: () => {
			state.patchStaff(input.staffId, { isActive: input.isActive });
		},
		rollback: () => {
			if (previous) {
				state.patchStaff(input.staffId, { isActive: previous.isActive });
			}
		},
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});

	return result !== null;
}

export async function deleteStaffOnPage(
	state: StaffPageState,
	staffId: string,
	options?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findStaff(staffId);

	const result = await runStaffRouteMutation({
		request: () => client.entities.staffMembers.delete({ id: staffId }),
		apply: () => {
			state.removeStaff(staffId);
		},
		rollback: () => {
			if (previous) {
				state.mergeStaff([previous]);
			}
		},
		successMessage: options?.successMessage,
		versionKeys: ['staff'],
	});

	return result !== null;
}

export async function updateStaffProfilePhotoOnPage(
	state: StaffPageState,
	input: {
		staffId: string;
		file: File;
		successMessage?: string;
	},
): Promise<boolean> {
	const resolvedSchoolId = schoolId();
	if (!resolvedSchoolId) {
		return false;
	}

	const previous = state.findStaff(input.staffId)?.photoUrl ?? null;

	const result = await runStaffRouteMutation({
		request: async () => {
			const uploaded = await uploadProfilePhoto({
				ownerKind: 'staff',
				ownerId: input.staffId,
				file: input.file,
				schoolId: resolvedSchoolId,
			});
			return withPhotoCacheBust(uploaded.photoUrl);
		},
		apply: () => {},
		rollback: () => {
			state.patchStaff(input.staffId, { photoUrl: previous });
			if (authSession.userProfile?.id === input.staffId) {
				authSession.userProfile = { ...authSession.userProfile, photoUrl: previous };
			}
		},
		onSuccess: (photoUrl) => {
			state.patchStaff(input.staffId, { photoUrl });
			if (authSession.userProfile?.id === input.staffId) {
				authSession.userProfile = { ...authSession.userProfile, photoUrl };
			}
		},
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});

	return result !== null;
}

export async function saveStaffPermissionOnPage(
	state: StaffPageState,
	input: {
		assignment: StaffPermissionAssignment;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.permissionAssignmentsForStaff(input.assignment.staffId)
		.find(row => row.id === input.assignment.id);

	const result = await runStaffRouteMutation({
		request: () => client.commands.assignStaffPermission(
			toStaffPermissionConfigCommand(input.assignment),
		),
		apply: () => {
			state.upsertPermissionAssignment({
				...input.assignment,
				scopeLabel: previous?.scopeLabel ?? input.assignment.scopeIds ?? '—',
				tenantWide: (input.assignment.scopeIds ?? '') === '',
				isSynced: Boolean(input.assignment.sourceStaffAssignmentId),
				hasMissingScope: previous?.hasMissingScope ?? false,
			});
		},
		rollback: () => {
			if (previous) {
				state.upsertPermissionAssignment(previous);
			}
			else {
				state.removePermissionAssignment(input.assignment.id);
			}
		},
		onSuccess: (assignment) => {
			const existing = state.permissionAssignmentsForStaff(assignment.staffId)
				.find(row => row.id === assignment.id);
			state.upsertPermissionAssignment({
				...assignment,
				scopeLabel: existing?.scopeLabel ?? assignment.scopeIds ?? '—',
				tenantWide: (assignment.scopeIds ?? '') === '',
				isSynced: Boolean(assignment.sourceStaffAssignmentId),
				hasMissingScope: existing?.hasMissingScope ?? false,
			});
		},
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});

	return result !== null;
}

export async function deleteStaffPermissionOnPage(
	state: StaffPageState,
	input: {
		assignmentId: string;
		staffId: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.permissionAssignmentsForStaff(input.staffId)
		.find(row => row.id === input.assignmentId);

	const result = await runStaffRouteMutation({
		request: () => client.entities.staffPermissionAssignments.delete({ id: input.assignmentId }),
		apply: () => {
			state.removePermissionAssignment(input.assignmentId);
		},
		rollback: () => {
			if (previous) {
				state.upsertPermissionAssignment(previous);
			}
		},
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});

	return result !== null;
}

export function buildStaffPermissionPayload(
	staff: StaffMember,
	input: {
		id: string;
		permission: StaffPermissionAssignmentView['permission'];
		scopeIds: string;
	},
) {
	return createStaffPermissionAssignmentPayload({
		id: input.id,
		staffId: staff.id,
		permission: input.permission,
		scopeIds: input.scopeIds,
	});
}
