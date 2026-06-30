import type { OnboardingDraft } from '$lib/onboarding/types';
import { createEmptyDraft, loadDraft, saveDraft } from '$lib/onboarding/draft-storage';
import { onboardingStepUrl } from '$lib/onboarding/navigation';

export function resolveOnboardingDraft(
	authUserId: string,
	options?: { schoolId?: string | null },
): OnboardingDraft {
	const stored = loadDraft(authUserId);
	const draft = stored ?? createEmptyDraft();

	if (options?.schoolId && !draft.schoolStepSubmitted) {
		return {
			...draft,
			schoolStepSubmitted: true,
			registeredSchoolId: options.schoolId,
		};
	}

	return draft;
}

export function shouldContinueOnboarding(
	authUserId: string | null | undefined,
	schoolId?: string | null,
): boolean {
	if (!authUserId) {
		return false;
	}
	return !resolveOnboardingDraft(authUserId, { schoolId }).wizardCompleted;
}

export function onboardingResumePath(
	authUserId: string | null | undefined,
	schoolId?: string | null,
): string | null {
	if (!authUserId || !shouldContinueOnboarding(authUserId, schoolId)) {
		return null;
	}

	const draft = resolveOnboardingDraft(authUserId, { schoolId });
	return onboardingStepUrl(draft.maxReachedStep);
}

export function persistSyncedOnboardingDraft(
	authUserId: string,
	options?: { schoolId?: string | null },
): OnboardingDraft {
	const stored = loadDraft(authUserId);
	const draft = resolveOnboardingDraft(authUserId, options);

	const needsPersist = !stored
		|| (Boolean(options?.schoolId) && !stored.schoolStepSubmitted && draft.schoolStepSubmitted);

	if (needsPersist) {
		saveDraft(authUserId, draft);
	}

	return draft;
}
