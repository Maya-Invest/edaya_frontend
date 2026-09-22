import type { GrantScope } from '$lib/api/grant-scopes';
import type { components } from '$lib/api/schema';
import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
import type { StaffMemberProfileRolePatch, StaffProfileRole } from '$lib/staff/staff-profile-roles';
import type { StaffMember } from '$lib/types/school';
import type { StaffPageState } from '../staff-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { grantScopesEquivalent } from '$lib/api/grant-scopes';
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
import { isProfileBoundGrant } from '$lib/api/staff-permission-profiles-data';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';
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
		scopes: assignment.scopes,
		startsAt: assignment.startsAt,
		endsAt: assignment.endsAt,
		status: assignment.status,
	};
}

function buildOptimisticStaff(input: {
	id: string;
	firstName: string;
	lastName: string;
	email?: string;
	profileRole: StaffProfileRole;
}): StaffMember {
	const email = input.email?.trim() ?? '';
	return {
		id: input.id,
		name: `${input.firstName.trim()} ${input.lastName.trim()}`,
		initials: staffInitials(input.firstName, input.lastName),
		role: input.profileRole,
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
		profileRole: StaffProfileRole;
		sendAccountInvitation?: boolean;
		permissionProfileId?: string;
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
			scopes: [{ kind: 'school' }],
		});
	}

	return id;
}

export async function updateStaffProfileOnPage(
	state: StaffPageState,
	input: {
		staffId: string;
		firstName: string;
		lastName: string;
		email?: string;
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
		firstName: input.firstName.trim(),
		lastName: input.lastName.trim(),
		email: email || null,
		profileRole: input.profileRole ?? null,
	};

	const result = await runStaffRouteMutation({
		request: () => client.commands.updateStaffMemberProfile(payload),
		apply: () => {
			state.patchStaff(input.staffId, {
				name: nextName,
				initials: staffInitials(input.firstName, input.lastName),
				email,
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

export async function saveStaffPermissionOnPage(
	state: StaffPageState,
	input: {
		assignment: StaffPermissionAssignment;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	if (isProfileBoundGrant(input.assignment.sourceProfileId)) {
		toast.error(get(t)('staff.permissionDuplicateBound'));
		return false;
	}
	const duplicateBound = state.permissionAssignmentsForStaff(input.assignment.staffId).some(row =>
		row.id !== input.assignment.id
		&& isProfileBoundGrant(row.sourceProfileId)
		&& row.permission === input.assignment.permission
		&& grantScopesEquivalent(row.scopes, input.assignment.scopes),
	);
	if (duplicateBound) {
		toast.error(get(t)('staff.permissionDuplicateBound'));
		return false;
	}
	const previous = state.permissionAssignmentsForStaff(input.assignment.staffId)
		.find(row => row.id === input.assignment.id);

	const result = await runStaffRouteMutation({
		request: () => client.commands.assignStaffPermission(
			toStaffPermissionConfigCommand(input.assignment),
		),
		apply: () => {
			state.upsertPermissionAssignment({
				...input.assignment,
				scopeLabel: previous?.scopeLabel ?? '—',
				tenantWide: input.assignment.scopes.some(scope => scope.kind === 'school'),
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
				scopeLabel: existing?.scopeLabel ?? '—',
				tenantWide: assignment.scopes.some(scope => scope.kind === 'school'),
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

export async function applyStaffPermissionProfileOnPage(
	state: StaffPageState,
	input: {
		staffId: string;
		profileId: string;
		scopes: GrantScope[];
		successMessage?: string;
	},
): Promise<boolean> {
	const ok = await applyStaffPermissionProfileMutation({
		staffId: input.staffId,
		profileId: input.profileId,
		scopes: input.scopes,
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
		scopes: StaffPermissionAssignment['scopes'];
	},
) {
	return createStaffPermissionAssignmentPayload({
		id: input.id,
		staffId: staff.id,
		permission: input.permission,
		scopes: input.scopes,
	});
}
