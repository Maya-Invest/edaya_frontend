import type { components } from '$lib/api/schema';
import {
	cachePendingInvitation,
	clearPendingInvitation,
} from '$lib/api/invitation-cache';
import { buildInviteUrl } from '$lib/api/invitation-url';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { runStudentRouteMutation } from './student-route-mutation';

type InvitationKind = components['schemas']['SendAccountInvitationCommand']['kind'];

export interface StudentInvitationDeliveryResult {
	invitationId: string;
	inviteUrl: string;
}

export async function sendStudentAccountInvitation(input: {
	kind: InvitationKind;
	targetId: string;
	contactValue?: string;
	successMessage?: string;
}): Promise<StudentInvitationDeliveryResult | null> {
	const client = getBrowserSchoolClient();
	const result = await runStudentRouteMutation(
		{
			request: () => client.commands.sendAccountInvitation({
				kind: input.kind,
				targetId: input.targetId,
				contactChannel: 'email',
				...(input.contactValue ? { contactValue: input.contactValue } : {}),
			}),
			successMessage: input.successMessage,
			versionKeys: ['students'],
		},
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

export async function resendStudentAccountInvitation(input: {
	kind: InvitationKind;
	targetId: string;
	invitationId: string;
	successMessage?: string;
}): Promise<StudentInvitationDeliveryResult | null> {
	const client = getBrowserSchoolClient();
	const result = await runStudentRouteMutation(
		{
			request: () => client.commands.resendAccountInvitation({ invitationId: input.invitationId }),
			successMessage: input.successMessage,
			versionKeys: ['students'],
		},
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

export async function revokeStudentAccountInvitation(input: {
	kind: InvitationKind;
	targetId: string;
	invitationId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runStudentRouteMutation(
		{
			request: () => client.commands.revokeAccountInvitation({ invitationId: input.invitationId }),
			successMessage: input.successMessage,
			versionKeys: ['students'],
		},
	);

	if (result !== null) {
		clearPendingInvitation(input.kind, input.targetId);
	}
	return result !== null;
}
