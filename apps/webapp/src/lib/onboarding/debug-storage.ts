import type { OnboardingDraft, ServerOnboardingAccountStatus } from '$lib/onboarding/types';
import { browser } from '$app/environment';

/** Temporary: keep draft + write a snapshot after finalize (for debugging session/network). */
export const PRESERVE_ONBOARDING_SESSION_FOR_DEBUG = true;

const DEBUG_FINALIZE_KEY = 'edaya:onboarding:debug:lastFinalize';

export function shouldClearOnboardingDraftAfterFinalize(): boolean {
	return !PRESERVE_ONBOARDING_SESSION_FOR_DEBUG;
}

export function persistOnboardingFinalizeDebugSnapshot(options: {
	authUserId: string | null;
	schoolId: string | null;
	serverStatus: ServerOnboardingAccountStatus | null;
	draft: OnboardingDraft;
	redirectTarget: string | null;
}): void {
	if (!browser) {
		return;
	}
	try {
		sessionStorage.setItem(DEBUG_FINALIZE_KEY, JSON.stringify({
			at: new Date().toISOString(),
			...options,
		}));
	}
	catch {
		// ignore quota errors
	}
}
