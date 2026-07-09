import type { OnboardingStaffInviteDraft } from '$lib/onboarding/types';
import { ApiError } from '$api-client';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { bootstrapAppShell, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { invitePortalTeachersOnboarding } from '$lib/onboarding/invite-portal-teachers';
import { partitionStaffInvitesForSubmit } from '$lib/onboarding/staff-step-helpers';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

function messageFromError(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.body && typeof error.body === 'object') {
			const body = error.body as Record<string, unknown>;
			if (body.code === 'STAFF_INVITE_OWNER_EMAIL') {
				return get(t)('onboarding.staffStep.ownerEmail');
			}
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

export async function submitStaffOnboardingStep(
	invites: OnboardingStaffInviteDraft[],
	options: { alreadySubmitted: boolean },
): Promise<boolean> {
	if (options.alreadySubmitted) {
		return true;
	}

	const { teacherInvites, staffInvites } = partitionStaffInvitesForSubmit(invites);
	if (teacherInvites.length === 0 && staffInvites.length === 0) {
		return true;
	}

	try {
		let invitedCount = 0;

		if (teacherInvites.length > 0) {
			const teacherCount = await invitePortalTeachersOnboarding(teacherInvites, {
				loginEmail: authSession.loginEmail,
			});
			if (teacherCount === null) {
				return false;
			}
			invitedCount += teacherCount;
		}

		if (staffInvites.length > 0) {
			const result = await getBrowserSchoolClient().onboarding.inviteStaffMembers({
				invites: staffInvites,
			});
			invitedCount += result.invitedCount;
		}

		resetAppShellBootstrap();
		await bootstrapAppShell();

		toast.success(get(t)('onboarding.staffStep.success', { count: invitedCount }));
		return true;
	}
	catch (error) {
		toast.error(messageFromError(error));
		return false;
	}
}
