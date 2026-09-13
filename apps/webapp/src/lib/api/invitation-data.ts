import type { components } from '$lib/api/schema';
import { pendingAccountInvitationForTarget } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient, getPublicSchoolClient } from '$lib/api/school-client';

export type InvitationPreview = components['schemas']['InvitationPreviewResponse'];
export type AccountInvitation = components['schemas']['AccountInvitation'];
export type AcceptInvitationResult = components['schemas']['AcceptInvitationResponse'];

export async function fetchPendingAccountInvitation(
	kind: 'staff' | 'guardian' | 'student' | 'teacher',
	targetId: string,
): Promise<AccountInvitation | null> {
	const client = getBrowserSchoolClient();
	const invitations = await client.entities.accountInvitations.list(
		pendingAccountInvitationForTarget(kind, targetId),
	);
	return invitations[0] ?? null;
}

export async function fetchInvitationPreview(token: string): Promise<InvitationPreview> {
	return getPublicSchoolClient().public.previewInvitation({ token });
}

export async function acceptInvitation(token: string): Promise<AcceptInvitationResult> {
	return getBrowserSchoolClient().public.acceptInvitation({ token });
}
