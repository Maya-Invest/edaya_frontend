import type { OnboardingStep } from '$lib/onboarding/types';
import { redirectPathIfAuthenticated } from '$lib/auth/resolve-post-auth';
import { authSession } from '$lib/auth/session.svelte';
import { isOnboardingSkipEnabled } from '$lib/env/app-env';
import { appGoto, appPath } from '$lib/navigation/app-navigation';
import { onboardingContext } from '$lib/onboarding/context.svelte';
import {
	canVisitOnboardingStep,
	clampOnboardingStep,
	parseOnboardingStep,
	writeOnboardingStepUrl,
} from '$lib/onboarding/navigation';
import { mergeOnboardingDraftWithServerStatus } from '$lib/onboarding/resume-onboarding';
import {
	canAdvanceFromStep,
	canFinishOnboarding,
	getOnboardingStepDefinition,
	nextOnboardingStep,
	previousOnboardingStep,
} from '$lib/onboarding/steps';
import { submitCompleteOnboardingStep } from '$lib/onboarding/submit-complete-step';
import { submitSchoolOnboardingStep } from '$lib/onboarding/submit-school-step';
import { submitStaffOnboardingStep } from '$lib/onboarding/submit-staff-step';
import { submitStructureOnboardingStep } from '$lib/onboarding/submit-structure-step';
import { fetchServerOnboardingAccountStatus } from '$lib/onboarding/sync-account-status';
import { getContext, setContext } from 'svelte';

const ONBOARDING_WIZARD_STATE_KEY = Symbol('onboarding-wizard-state');

export class OnboardingWizardState {
	busy = $state(false);
	syncedServerStatus = $state(false);

	constructor(private readonly getUrl: () => URL) {}

	get currentStep(): OnboardingStep {
		return parseOnboardingStep(this.getUrl());
	}

	get maxReachedStep(): OnboardingStep {
		return onboardingContext.draft.maxReachedStep;
	}

	get stepDefinition() {
		return getOnboardingStepDefinition(this.currentStep);
	}

	get canAdvance(): boolean {
		return canAdvanceFromStep(
			this.currentStep,
			onboardingContext.draft,
			authSession.loginEmail,
		);
	}

	get canGoBack(): boolean {
		return this.currentStep > 1;
	}

	get nextStep(): OnboardingStep | null {
		return nextOnboardingStep(this.currentStep);
	}

	get showContinue(): boolean {
		return this.currentStep < 4 && this.nextStep !== null;
	}

	get showFinish(): boolean {
		return this.currentStep === 4;
	}

	get canFinish(): boolean {
		return canFinishOnboarding(onboardingContext.draft);
	}

	get showSkip(): boolean {
		return Boolean(this.stepDefinition.optional && this.nextStep !== null);
	}

	get showSkipOnboarding(): boolean {
		return isOnboardingSkipEnabled();
	}

	get canSkipOnboarding(): boolean {
		return authSession.isLoggedIn;
	}

	initAuthUser(authUserId: string | null) {
		if (authUserId) {
			onboardingContext.init(authUserId);
		}
	}

	enforceStepAccess() {
		if (!onboardingContext.initialized) {
			return;
		}

		const requested = parseOnboardingStep(this.getUrl());
		const allowed = clampOnboardingStep(requested, this.maxReachedStep);
		if (requested !== allowed) {
			appGoto(writeOnboardingStepUrl(this.getUrl(), allowed), { replaceState: true });
		}
	}

	async syncServerStatusOnce() {
		if (!onboardingContext.initialized || !authSession.isLoggedIn || this.syncedServerStatus) {
			return;
		}

		this.syncedServerStatus = true;

		const status = await fetchServerOnboardingAccountStatus();
		if (!status) {
			return;
		}

		const merged = mergeOnboardingDraftWithServerStatus(
			onboardingContext.draft,
			status,
			authSession.schoolId,
		);

		if (merged.wizardCompleted) {
			onboardingContext.markWizardCompleted();
			onboardingContext.clearStoredDraft();
			const target = redirectPathIfAuthenticated();
			if (target) {
				appGoto(target, { replaceState: true });
			}
			return;
		}

		if (merged.schoolStepSubmitted && !onboardingContext.draft.schoolStepSubmitted && merged.registeredSchoolId) {
			onboardingContext.markSchoolStepSubmitted(merged.registeredSchoolId);
		}
		if (merged.structureStepSubmitted && !onboardingContext.draft.structureStepSubmitted) {
			onboardingContext.markStructureStepSubmitted();
		}
		if (merged.maxReachedStep > onboardingContext.draft.maxReachedStep) {
			onboardingContext.markStepReached(merged.maxReachedStep);
		}
	}

	navigateToStep(step: OnboardingStep) {
		if (!canVisitOnboardingStep(step, this.maxReachedStep)) {
			return;
		}
		appGoto(writeOnboardingStepUrl(this.getUrl(), step));
	}

	goBack() {
		const previous = previousOnboardingStep(this.currentStep);
		if (previous) {
			this.navigateToStep(previous);
		}
	}

	async goNext() {
		if (!this.canAdvance || !this.nextStep || this.busy) {
			return;
		}

		if (this.currentStep === 1) {
			this.busy = true;
			try {
				const result = await submitSchoolOnboardingStep(onboardingContext.draft.school, {
					alreadySubmitted: onboardingContext.draft.schoolStepSubmitted,
					registeredSchoolId: onboardingContext.draft.registeredSchoolId,
				});
				if (!result) {
					return;
				}
				if (!onboardingContext.draft.schoolStepSubmitted) {
					onboardingContext.markSchoolStepSubmitted(result.schoolId);
				}
				onboardingContext.markStepReached(this.nextStep);
				appGoto(writeOnboardingStepUrl(this.getUrl(), this.nextStep));
			}
			finally {
				this.busy = false;
			}
			return;
		}

		if (this.currentStep === 2) {
			this.busy = true;
			try {
				const success = await submitStructureOnboardingStep(onboardingContext.draft.structure, {
					alreadySubmitted: onboardingContext.draft.structureStepSubmitted,
				});
				if (!success) {
					return;
				}
				if (!onboardingContext.draft.structureStepSubmitted) {
					onboardingContext.markStructureStepSubmitted();
				}
				onboardingContext.markStepReached(this.nextStep);
				appGoto(writeOnboardingStepUrl(this.getUrl(), this.nextStep));
			}
			finally {
				this.busy = false;
			}
			return;
		}

		if (this.currentStep === 3) {
			this.busy = true;
			try {
				const success = await submitStaffOnboardingStep(onboardingContext.draft.staffInvites, {
					alreadySubmitted: onboardingContext.draft.staffStepSubmitted,
				});
				if (!success) {
					return;
				}
				if (!onboardingContext.draft.staffStepSubmitted) {
					onboardingContext.markStaffStepSubmitted();
				}
				onboardingContext.markStepReached(this.nextStep);
				appGoto(writeOnboardingStepUrl(this.getUrl(), this.nextStep));
			}
			finally {
				this.busy = false;
			}
			return;
		}

		onboardingContext.markStepReached(this.nextStep);
		appGoto(writeOnboardingStepUrl(this.getUrl(), this.nextStep));
	}

	skipStep() {
		if (!this.stepDefinition.optional || !this.nextStep) {
			return;
		}
		onboardingContext.markStepReached(this.nextStep);
		appGoto(writeOnboardingStepUrl(this.getUrl(), this.nextStep));
	}

	async completeAndExitOnboarding(
		options: {
			successMessageKey?: 'onboarding.completeStep.success' | 'onboarding.skipWizardSuccess';
		} = {},
	): Promise<boolean> {
		const success = await submitCompleteOnboardingStep(options);
		if (!success) {
			return false;
		}

		onboardingContext.markWizardCompleted();
		onboardingContext.clearStoredDraft();

		const target = redirectPathIfAuthenticated();
		if (target) {
			appGoto(target, { replaceState: true });
		}
		return true;
	}

	async finishOnboarding() {
		if (!this.canFinish || this.busy) {
			return;
		}

		this.busy = true;
		try {
			await this.completeAndExitOnboarding();
		}
		finally {
			this.busy = false;
		}
	}

	async skipOnboarding() {
		if (!this.canSkipOnboarding || this.busy) {
			return;
		}

		this.busy = true;
		try {
			await this.completeAndExitOnboarding({ successMessageKey: 'onboarding.skipWizardSuccess' });
		}
		finally {
			this.busy = false;
		}
	}

	async signOut() {
		this.busy = true;
		try {
			await authSession.logout();
			onboardingContext.reset();
			appGoto(appPath('/login'), { replaceState: true });
		}
		finally {
			this.busy = false;
		}
	}
}

export function setOnboardingWizardState(state: OnboardingWizardState) {
	setContext(ONBOARDING_WIZARD_STATE_KEY, state);
}

export function getOnboardingWizardState(): OnboardingWizardState {
	return getContext<OnboardingWizardState>(ONBOARDING_WIZARD_STATE_KEY);
}
