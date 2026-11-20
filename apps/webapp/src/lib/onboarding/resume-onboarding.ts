import type { OnboardingDraft, OnboardingStep, ServerOnboardingAccountStatus } from '$lib/onboarding/types';
import { createEmptyDraft, loadDraft, saveDraft } from '$lib/onboarding/draft-storage';
import { onboardingStepUrl } from '$lib/onboarding/navigation';
import {
	isOnboardingSummaryHold,
	isWizardCompletedInSession,
} from '$lib/onboarding/wizard-completion-flag';

export function mergeOnboardingDraftWithServerStatus(
	draft: OnboardingDraft,
	status: ServerOnboardingAccountStatus,
	schoolId?: string | null,
	options?: { holdLocalWizardCompleted?: boolean },
): OnboardingDraft {
	// Local draft remains source of truth until provision succeeds.
	// Server flags only raise progress (OR / Math.max), never lower it.
	return {
		...draft,
		wizardCompleted: options?.holdLocalWizardCompleted
			? false
			: draft.wizardCompleted || status.wizardCompleted,
		maxReachedStep: Math.max(draft.maxReachedStep, status.maxReachedStep) as OnboardingStep,
		schoolStepSubmitted: draft.schoolStepSubmitted || status.schoolStepSubmitted,
		structureStepSubmitted: draft.structureStepSubmitted || status.structureStepSubmitted,
		registeredSchoolId: draft.registeredSchoolId ?? schoolId ?? null,
	};
}

export function resolveOnboardingDraft(
	authUserId: string,
	options?: { schoolId?: string | null },
) {
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

export function persistServerOnboardingStatusToDraft(
	authUserId: string,
	status: ServerOnboardingAccountStatus,
	schoolId?: string | null,
	options?: { holdLocalWizardCompleted?: boolean },
) {
	const merged = mergeOnboardingDraftWithServerStatus(
		resolveOnboardingDraft(authUserId, { schoolId }),
		status,
		schoolId,
		options,
	);
	saveDraft(authUserId, merged);
	return merged;
}

export function shouldContinueOnboarding(
	authUserId: string | null | undefined,
	schoolId?: string | null,
	serverStatus?: ServerOnboardingAccountStatus | null,
): boolean {
	if (!authUserId) {
		return false;
	}

	if (isWizardCompletedInSession(authUserId)) {
		return false;
	}

	// Linked actors: last gate before dashboard uses server account-status only.
	// Leftover local drafts must not send invited staff into the owner wizard.
	if (schoolId) {
		return Boolean(serverStatus && !serverStatus.wizardCompleted);
	}

	if (serverStatus?.wizardCompleted) {
		return false;
	}

	const draft = resolveOnboardingDraft(authUserId, { schoolId });
	if (draft.wizardCompleted) {
		return false;
	}

	// No server status (e.g. account-status 403) and no local draft: do not send owners back to step 1.
	if (!loadDraft(authUserId)) {
		return false;
	}

	return draft.maxReachedStep > 1;
}

export function onboardingResumePath(
	authUserId: string | null | undefined,
	schoolId?: string | null,
	serverStatus?: ServerOnboardingAccountStatus | null,
): string | null {
	if (!authUserId || !shouldContinueOnboarding(authUserId, schoolId, serverStatus)) {
		return null;
	}

	const draft = resolveOnboardingDraft(authUserId, { schoolId });
	const maxReachedStep = serverStatus
		? Math.max(draft.maxReachedStep, serverStatus.maxReachedStep) as OnboardingStep
		: draft.maxReachedStep;

	return onboardingStepUrl(maxReachedStep);
}

/** Stay on the step-4 summary after provision until the user opens the dashboard. */
export function shouldHoldOnboardingSummary(options: {
	localWizardCompleted: boolean;
	provisionProgressVisible: boolean;
	provisionSucceeded: boolean;
	serverWizardCompleted?: boolean;
	summaryHold?: boolean;
}): boolean {
	if (options.summaryHold === true) {
		return true;
	}
	if (options.localWizardCompleted) {
		return false;
	}
	// Visible progress is not proof of a committed provision: a rejected request must remain retryable.
	return options.provisionSucceeded
		|| options.serverWizardCompleted === true;
}

export function persistSyncedOnboardingDraft(
	authUserId: string,
	options?: { schoolId?: string | null },
) {
	const stored = loadDraft(authUserId);
	let draft = resolveOnboardingDraft(authUserId, options);
	if (isOnboardingSummaryHold(authUserId) && draft.wizardCompleted) {
		draft = { ...draft, wizardCompleted: false };
	}

	const needsPersist = Boolean(stored)
		|| draft.wizardCompleted
		|| draft.maxReachedStep > 1
		|| isOnboardingSummaryHold(authUserId);

	if (needsPersist) {
		saveDraft(authUserId, draft);
	}

	return draft;
}
