import { ApiError } from '@maya-invest/edaya-api-client';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { bootstrapSession } from '$lib/auth/bootstrap';
import { bootstrapAppShell, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { persistServerOnboardingStatusToDraft } from '$lib/onboarding/resume-onboarding';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

function messageFromError(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.body && typeof error.body === 'object') {
			const body = error.body as Record<string, unknown>;
			if (typeof body.message === 'string' && body.message.length > 0) {
				return body.message;
			}
		}
	}
	return get(t)('onboarding.completeStep.failed');
}

export async function submitCompleteOnboardingStep(options?: {
	successMessageKey?: 'onboarding.completeStep.success' | 'onboarding.skipWizardSuccess';
}): Promise<boolean> {
	try {
		const status = await getBrowserSchoolClient().onboarding.completeWizard({});

		resetAppShellBootstrap();
		await bootstrapSession();
		authSession.setServerOnboardingStatus(status);
		if (authSession.authUserId) {
			persistServerOnboardingStatusToDraft(
				authSession.authUserId,
				status,
				authSession.schoolId,
			);
		}
		await bootstrapAppShell();

		const messageKey = options?.successMessageKey ?? 'onboarding.completeStep.success';
		toast.success(get(t)(messageKey));
		return true;
	}
	catch (error) {
		toast.error(messageFromError(error));
		return false;
	}
}
