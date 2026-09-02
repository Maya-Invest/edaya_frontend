import { getBrowserSchoolClient } from '$lib/api/school-client';
import { bootstrapSession } from '$lib/auth/bootstrap';
import { bootstrapAppShell, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { onboardingUserErrorMessage } from '$lib/onboarding/onboarding-user-error';
import { persistServerOnboardingStatusToDraft } from '$lib/onboarding/resume-onboarding';
import { markWizardCompletedInSession } from '$lib/onboarding/wizard-completion-flag';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export async function submitCompleteOnboardingStep(options?: {
	successMessageKey?: 'onboarding.completeStep.success' | 'onboarding.skipWizardSuccess';
	onError?: (message: string) => void;
}): Promise<boolean> {
	try {
		const status = await getBrowserSchoolClient().onboarding.completeWizard({});

		authSession.setServerOnboardingStatus(status);
		if (authSession.authUserId) {
			markWizardCompletedInSession(authSession.authUserId);
		}

		resetAppShellBootstrap();
		await bootstrapSession({ silent: true });
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
		const message = onboardingUserErrorMessage(error, 'onboarding.completeStep.failed');
		options?.onError?.(message);
		toast.error(message);
		return false;
	}
}
