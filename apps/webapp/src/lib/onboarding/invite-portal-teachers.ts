import { ApiError } from '@edaya/api-client';
import { createTeacherMutation } from '$lib/api/mutations/teacher.mutations';
import { t } from '$lib/i18n';
import { namesFromInviteEmail } from '$lib/onboarding/names-from-email';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export interface PortalTeacherInviteInput {
	email: string;
}

function messageFromError(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.body && typeof error.body === 'object') {
			const body = error.body as Record<string, unknown>;
			if (body.code === 'INVITE_BASE_URL_MISSING') {
				return get(t)('onboarding.staffStep.inviteUrlMissing');
			}
			if (typeof body.message === 'string' && body.message.length > 0) {
				return body.message;
			}
		}
	}
	return get(t)('onboarding.staffStep.failed');
}

export async function invitePortalTeachersOnboarding(
	invites: PortalTeacherInviteInput[],
	options: { loginEmail?: string | null },
): Promise<number | null> {
	const normalizedLogin = options.loginEmail?.trim().toLowerCase() ?? '';

	for (const invite of invites) {
		const normalized = invite.email.trim().toLowerCase();
		if (normalizedLogin && normalized === normalizedLogin) {
			toast.error(get(t)('onboarding.staffStep.ownerEmail'));
			return null;
		}
	}

	let invitedCount = 0;

	try {
		for (const invite of invites) {
			const email = invite.email.trim();
			const { firstName, lastName } = namesFromInviteEmail(email);
			const teacherId = await createTeacherMutation({
				firstName,
				lastName,
				email,
				sendAccountInvitation: true,
			});
			if (!teacherId) {
				return null;
			}
			invitedCount += 1;
		}
	}
	catch (error) {
		toast.error(messageFromError(error));
		return null;
	}

	return invitedCount;
}
