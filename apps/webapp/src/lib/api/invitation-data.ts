import type { components } from '$lib/api/schema';
import { listAllEntityPages, pendingAccountInvitationForTarget } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';

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
	return getBrowserSchoolClient().public.previewInvitation({ token });
}

export async function acceptInvitation(token: string): Promise<AcceptInvitationResult> {
	return getBrowserSchoolClient().public.acceptInvitation({ token });
}

export type InvitationHistoryEntry = Pick<AccountInvitation, 'id' | 'status' | 'contactChannel' | 'contactValue' | 'createdAt' | 'expiresAt' | 'acceptedAt' | 'createdByStaffId' | 'lastSentAt'>;
export async function fetchAccountInvitationHistory(kind: 'staff' | 'guardian' | 'student' | 'teacher', targetId: string): Promise<InvitationHistoryEntry[]> {
	const rows = await listAllEntityPages(query => getBrowserSchoolClient().entities.accountInvitations.list(query), { baseQuery: { kind, targetId } });
	return rows.map(({ id, status, contactChannel, contactValue, createdAt, expiresAt, acceptedAt, createdByStaffId, lastSentAt }) => ({ id, status, contactChannel, contactValue, createdAt, expiresAt, acceptedAt, createdByStaffId, lastSentAt }));
}
