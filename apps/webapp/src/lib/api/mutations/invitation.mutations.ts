import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import {
	cachePendingInvitation,
	clearPendingInvitation,
} from '$lib/api/invitation-cache';
import { buildInviteUrl } from '$lib/api/invitation-url';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

type InvitationKind = components['schemas']['SendAccountInvitationCommand']['kind'];

function invitationVersionKeys(kind: InvitationKind): EntityVersionKey[] {
	return [kind === 'teacher' ? 'teachers' : kind === 'guardian' ? 'guardians' : kind === 'student' ? 'students' : 'staff'];
}

export interface InvitationDeliveryResult {
	invitationId: string;
	inviteUrl: string;
}

export async function sendAccountInvitationMutation(input: {
	kind: InvitationKind;
	targetId: string;
	contactValue?: string;
	successMessage?: string;
}): Promise<InvitationDeliveryResult | null> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.sendAccountInvitation({
			kind: input.kind,
			targetId: input.targetId,
			contactChannel: 'email',
			...(input.contactValue ? { contactValue: input.contactValue } : {}),
		}),
		{ successMessage: input.successMessage, versionKeys: invitationVersionKeys(input.kind) },
	);

	if (!result?.invitation?.id || !result?.token) {
		return null;
	}

	cachePendingInvitation(input.kind, input.targetId, result.invitation.id);
	return {
		invitationId: result.invitation.id,
		inviteUrl: buildInviteUrl(result.token),
	};
}

export async function resendAccountInvitationMutation(input: {
	kind: InvitationKind;
	targetId: string;
	invitationId: string;
	successMessage?: string;
}): Promise<InvitationDeliveryResult | null> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.resendAccountInvitation({ invitationId: input.invitationId }),
		{ successMessage: input.successMessage, versionKeys: invitationVersionKeys(input.kind) },
	);

	if (!result?.invitation?.id || !result?.token) {
		return null;
	}

	cachePendingInvitation(input.kind, input.targetId, result.invitation.id);
	return {
		invitationId: result.invitation.id,
		inviteUrl: buildInviteUrl(result.token),
	};
}

export async function revokeAccountInvitationMutation(input: {
	kind: InvitationKind;
	targetId: string;
	invitationId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.revokeAccountInvitation({ invitationId: input.invitationId }),
		{ successMessage: input.successMessage, versionKeys: invitationVersionKeys(input.kind) },
	);

	if (result !== null) {
		clearPendingInvitation(input.kind, input.targetId);
	}
	return result !== null;
}
