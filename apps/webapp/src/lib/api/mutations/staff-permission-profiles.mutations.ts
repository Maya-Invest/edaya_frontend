import type { GrantScope } from '$lib/api/grant-scopes';
import type { components } from '$lib/api/schema';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

type StaffPermissionProfile = components['schemas']['StaffPermissionProfile'];
type ConfigurePermissionProfileCommand = components['schemas']['ConfigurePermissionProfileCommand'];

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

function academicYearId(): string {
	return academicContext.yearId;
}

export async function configurePermissionProfileMutation(input: {
	profile: ConfigurePermissionProfileCommand;
	successMessage?: string;
}): Promise<StaffPermissionProfile | null> {
	const client = getBrowserSchoolClient();
	return runMutation(
		() => client.commands.configurePermissionProfile(input.profile),
		{
			successMessage: input.successMessage,
			versionKeys: ['staff'],
		},
	);
}

export async function deletePermissionProfileMutation(input: {
	id: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.entities.staffPermissionProfiles.delete({ id: input.id }),
		{
			successMessage: input.successMessage,
			versionKeys: ['staff'],
		},
	);
	return result !== null;
}

export async function applyStaffPermissionProfileMutation(input: {
	staffId: string;
	profileId: string;
	customScopes: GrantScope[];
	useDefaultScopes: boolean;
	academicYearId?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.applyStaffPermissionProfile({
			staffId: input.staffId,
			profileId: input.profileId,
			academicYearId: input.academicYearId ?? academicYearId(),
			customScopes: input.customScopes,
			useDefaultScopes: input.useDefaultScopes,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['staff'],
		},
	);
	return result !== null;
}

export async function reorderStaffPermissionProfilesMutation(input: {
	staffId: string;
	profileIds: string[];
	academicYearId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.reorderStaffPermissionProfiles({
			staffId: input.staffId,
			profileIds: input.profileIds,
			academicYearId: input.academicYearId,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['staff'],
		},
	);
	return result !== null;
}

export async function removeStaffPermissionProfileMutation(input: {
	academicYearId: string;
	staffId: string;
	profileId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.removeStaffPermissionProfile({
			staffId: input.staffId,
			profileId: input.profileId,
			academicYearId: input.academicYearId,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['staff'],
		},
	);
	return result !== null;
}

export function schoolIdForProfile(): string {
	return schoolId();
}
