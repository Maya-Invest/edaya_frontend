import type { UserScopeSelection } from '$lib/api/grant-scopes';
import type { components } from '$lib/api/schema';
import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
import type { StaffMemberProfileRolePatch, StaffProfileRole } from '$lib/staff/staff-profile-roles';
import type { StaffMember } from '$lib/types/school';
import type { StaffPageState } from '../staff-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import {
	createStaffPermissionAssignmentPayload,
} from '$lib/api/mutations/staff-permission-assignments.mutations';
import {
	applyStaffPermissionProfileMutation,
	removeStaffPermissionProfileMutation,
	reorderStaffPermissionProfilesMutation,
} from '$lib/api/mutations/staff-permission-profiles.mutations';
import { displayProfilePhotoUrl, uploadProfilePhoto } from '$lib/api/profile-photo-upload';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { runStaffRouteMutation } from './staff-route-mutation';

type StaffPermissionAssignmentConfigCommand = components['schemas']['StaffPermissionAssignmentConfigCommand'];

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? 'sch-edaya-ci-cocody';
}

function staffInitials(firstName: string, lastName: string): string {
	return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
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

function buildOptimisticStaff(input: {
	id: string;
	code?: string;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	profileRole: StaffProfileRole;
}): StaffMember {
	const email = input.email?.trim() ?? '';
	return {
		code: input.code?.trim() || null,
		id: input.id,
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		name: `${input.firstName.trim()} ${input.lastName.trim()}`,
		initials: staffInitials(input.firstName, input.lastName),
		role: input.profileRole,
		department: '—',
		email,
		phone: input.phone?.trim() || null,
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
		phone?: string;
		profileRole: StaffProfileRole;
		sendAccountInvitation?: boolean;
		permissionProfileId?: string;
		customScopes?: UserScopeSelection[];
		useDefaultScopes?: boolean;
		successMessage?: string;
	},
): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const email = input.email?.trim() ?? '';
	const code = input.code?.trim() || undefined;
	const id = crypto.randomUUID();
	const optimistic = buildOptimisticStaff({ id, ...input });

	const payload: components['schemas']['RegisterStaffMemberCommand'] & StaffMemberProfileRolePatch = {
		id,
		schoolId: schoolId(),
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		...(code ? { code } : {}),
		email: email || null,
		...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
		accountKind: 'human',
		isActive: true,
		serviceElevated: false,
		profileRole: input.profileRole,
		sendAccountInvitation: input.sendAccountInvitation ?? true,
		createdAt: new Date().toISOString(),
	};

	const result = await runStaffRouteMutation({
		request: () => client.commands.registerStaffMember(payload),
		apply: () => {
			state.appendStaff(optimistic);
		},
		rollback: () => {
			state.removeStaff(id);
		},
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});

	if (!result) {
		return null;
	}

	if (input.permissionProfileId) {
		await applyStaffPermissionProfileOnPage(state, {
			staffId: id,
			profileId: input.permissionProfileId,
			customScopes: input.customScopes ?? [],
			useDefaultScopes: input.useDefaultScopes ?? true,
		});
	}

	return id;
}

export async function updateStaffProfileOnPage(
	state: StaffPageState,
	input: {
		staffId: string;
		profile?: Record<string, string>;
		firstName: string;
		lastName: string;
		email?: string;
		phone?: string;
		profileRole?: StaffProfileRole | null;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findStaff(input.staffId);
	const email = input.email?.trim() ?? '';
	const nextName = `${input.firstName.trim()} ${input.lastName.trim()}`;

	const payload: components['schemas']['UpdateStaffMemberProfileCommand'] & StaffMemberProfileRolePatch = {
		staffId: input.staffId,
		...(input.profile && 'code' in input.profile ? { code: input.profile.code?.trim() || null } : {}),
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		email: email || null,
		...(input.profile && 'phone' in input.profile ? { phone: input.profile.phone?.trim() || null } : {}),
		...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
		profileRole: input.profileRole ?? null,
	};

	const result = await runStaffRouteMutation({
		request: () => client.commands.updateStaffMemberProfile(payload),
		apply: () => {
			state.patchStaff(input.staffId, {
				firstName: input.firstName.trim(),
				lastName: input.lastName.trim(),
				...(input.profile && 'code' in input.profile ? { code: input.profile.code?.trim() || null } : {}),
				name: nextName,
				initials: staffInitials(input.firstName, input.lastName),
				email,
				...(input.profile && 'phone' in input.profile ? { phone: input.profile.phone?.trim() || null } : {}),
				...(input.profileRole ? { role: input.profileRole } : {}),
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
			await getBrowserSchoolClient().commands.updateStaffMemberProfile({
				staffId: input.staffId,
				photoUrl: uploaded.photoUrl,
			});
			return displayProfilePhotoUrl(uploaded.attachmentId);
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

export async function saveStaffPermissionOnPage(state: StaffPageState, input: { assignment: StaffPermissionAssignmentView; successMessage?: string }): Promise<boolean> {
	const result = await runStaffRouteMutation({
		request: () => getBrowserSchoolClient().commands.assignStaffPermission(toStaffPermissionConfigCommand(input.assignment)),
		apply: () => {},
		rollback: () => {},
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});
	if (result)
		await state.reloadPermissionData();
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
		request: () => client.commands.removeStaffPermission({ assignmentId: input.assignmentId }),
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

export async function applyStaffPermissionProfileOnPage(
	state: StaffPageState,
	input: {
		staffId: string;
		profileId: string;
		customScopes: UserScopeSelection[];
		useDefaultScopes: boolean;
		successMessage?: string;
	},
): Promise<boolean> {
	const ok = await applyStaffPermissionProfileMutation({
		staffId: input.staffId,
		profileId: input.profileId,
		customScopes: input.customScopes,
		useDefaultScopes: input.useDefaultScopes,
		academicYearId: state.staffScope().academicYearId,
		successMessage: input.successMessage,
	});
	if (ok) {
		await state.reloadPermissionData();
	}
	return ok;
}

export async function reorderStaffPermissionProfilesOnPage(
	state: StaffPageState,
	input: {
		staffId: string;
		profileIds: string[];
		successMessage?: string;
	},
): Promise<boolean> {
	const ok = await reorderStaffPermissionProfilesMutation({
		staffId: input.staffId,
		profileIds: input.profileIds,
		academicYearId: state.staffScope().academicYearId,
		successMessage: input.successMessage,
	});
	if (ok) {
		await state.reloadPermissionData();
	}
	return ok;
}

export async function removeStaffPermissionProfileOnPage(
	state: StaffPageState,
	input: {
		staffId: string;
		profileId: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const ok = await removeStaffPermissionProfileMutation({
		staffId: input.staffId,
		profileId: input.profileId,
		academicYearId: state.staffScope().academicYearId,
		successMessage: input.successMessage,
	});
	if (ok) {
		await state.reloadPermissionData();
	}
	return ok;
}

export function buildStaffPermissionPayload(
	staff: StaffMember,
	input: {
		id: string;
		permission: StaffPermissionAssignmentView['permission'];
		scopes: StaffPermissionAssignmentView['scopes'];
		customScopes?: StaffPermissionAssignmentView['scopes'];
		useDefaultScopes?: boolean;
	},
) {
	return createStaffPermissionAssignmentPayload({
		id: input.id,
		staffId: staff.id,
		permission: input.permission,
		scopes: input.scopes,
	});
}
