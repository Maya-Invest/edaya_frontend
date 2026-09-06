import type { ProvisionProgressStep } from '$lib/onboarding/provision-progress';
import type { OnboardingStep } from '$lib/onboarding/types';
import { academicContext } from '$lib/academic/context.svelte';
import { redirectPathIfAuthenticated } from '$lib/auth/resolve-post-auth';
import { authSession } from '$lib/auth/session.svelte';
import { isOnboardingSkipEnabled } from '$lib/env/app-env';
import { t } from '$lib/i18n';
import { appGoto, appPath } from '$lib/navigation/app-navigation';
import { onboardingContext } from '$lib/onboarding/context.svelte';
import {
	persistOnboardingFinalizeDebugSnapshot,
	shouldClearOnboardingDraftAfterFinalize,
} from '$lib/onboarding/debug-storage';
import {
	canVisitOnboardingStep,
	clampOnboardingStep,
	parseOnboardingStep,
	writeOnboardingStepUrl,
} from '$lib/onboarding/navigation';
import {
	getProvisionProgressSteps,
} from '$lib/onboarding/provision-progress';
import { mergeOnboardingDraftWithServerStatus } from '$lib/onboarding/resume-onboarding';
import { staffInvitesForSubmit } from '$lib/onboarding/staff-step-helpers';
import {
	canAdvanceFromStep,
	canFinishOnboarding,
	getOnboardingStepDefinition,
	nextOnboardingStep,
	previousOnboardingStep,
} from '$lib/onboarding/steps';
import { submitCompleteOnboardingStep } from '$lib/onboarding/submit-complete-step';
import { submitProvisionOnboarding } from '$lib/onboarding/submit-provision-step';
import { fetchServerOnboardingAccountStatus } from '$lib/onboarding/sync-account-status';
import { toast } from '$lib/toast.svelte';
import { getContext, setContext } from 'svelte';
import { get } from 'svelte/store';

const ONBOARDING_WIZARD_STATE_KEY = Symbol('onboarding-wizard-state');

export class OnboardingWizardState {
	busy = $state(false);
	syncedServerStatus = $state(false);
	/** Optional phase label while Finish provision is running. */
	provisionPhase = $state<string | null>(null);
	provisionPercent = $state(0);
	provisionActiveStepId = $state<string | null>(null);
	provisionCompletedIds = $state<string[]>([]);
	provisionSteps = $state<Array<Pick<ProvisionProgressStep, 'id' | 'labelKey'>>>([]);
	provisionProgressVisible = $state(false);
	lastActionError = $state<string | null>(null);

	private reportActionError(message: string) {
		this.lastActionError = message;
		toast.error(message);
	}

	private resetProvisionProgress() {
		this.provisionPhase = null;
		this.provisionPercent = 0;
		this.provisionActiveStepId = null;
		this.provisionCompletedIds = [];
		this.provisionSteps = [];
		this.provisionProgressVisible = false;
	}

	private initProvisionProgress() {
		const includeStaff = staffInvitesForSubmit(onboardingContext.draft.staffInvites).length > 0;
		const steps = getProvisionProgressSteps({ includeStaff });
		this.provisionSteps = steps.map(step => ({ id: step.id, labelKey: step.labelKey }));
		this.provisionPercent = 0;
		this.provisionActiveStepId = steps[0]?.id ?? null;
		this.provisionCompletedIds = [];
		this.provisionProgressVisible = true;
		this.provisionPhase = 'provision';
	}

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
		// Skip-to-dashboard is only meaningful after school + classes (steps 1–2).
		return isOnboardingSkipEnabled() && this.currentStep >= 3;
	}

	get canSkipOnboarding(): boolean {
		return authSession.isLoggedIn && this.currentStep >= 3;
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
			if (shouldClearOnboardingDraftAfterFinalize()) {
				onboardingContext.clearStoredDraft();
			}
			else {
				onboardingContext.persist();
			}
			const target = redirectPathIfAuthenticated();
			if (target) {
				appGoto(target, { replaceState: true });
			}
			return;
		}

		// Only adopt server "submitted" flags when the server actually has DB progress.
		// Empty server status must not reset draft maxReachedStep / filled form fields.
		if (status.schoolStepSubmitted && !onboardingContext.draft.schoolStepSubmitted && merged.registeredSchoolId) {
			onboardingContext.markSchoolStepSubmitted(merged.registeredSchoolId);
		}
		if (status.structureStepSubmitted && !onboardingContext.draft.structureStepSubmitted) {
			onboardingContext.markStructureStepSubmitted();
		}
		if (status.maxReachedStep > onboardingContext.draft.maxReachedStep) {
			onboardingContext.markStepReached(status.maxReachedStep);
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

	/**
	 * Steps 1–3 only validate + persist draft locally. Provisioning runs on Finish.
	 */
	goNext() {
		const next = this.nextStep;
		if (!this.canAdvance || !next || this.busy) {
			return;
		}

		onboardingContext.persist();

		if (this.currentStep === 1 && !onboardingContext.draft.schoolStepSubmitted) {
			onboardingContext.markSchoolStepSubmitted();
		}
		if (this.currentStep === 2 && !onboardingContext.draft.structureStepSubmitted) {
			onboardingContext.markStructureStepSubmitted();
		}
		if (this.currentStep === 3 && !onboardingContext.draft.staffStepSubmitted) {
			onboardingContext.markStaffStepSubmitted();
		}

		onboardingContext.markStepReached(next);
		appGoto(writeOnboardingStepUrl(this.getUrl(), next));
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
			provision?: boolean;
		} = {},
	): Promise<boolean> {
		const shouldProvision = options.provision !== false
			&& canFinishOnboarding(onboardingContext.draft);

		if (shouldProvision) {
			this.initProvisionProgress();
			const result = await submitProvisionOnboarding(onboardingContext.draft, {
				successMessageKey: options.successMessageKey,
				onProgress: (state) => {
					this.provisionPhase = state.phase;
					this.provisionPercent = state.percent;
					this.provisionActiveStepId = state.activeStepId;
					this.provisionCompletedIds = state.completedIds;
				},
				onError: (message) => {
					this.lastActionError = message;
				},
			});
			if (!result) {
				this.resetProvisionProgress();
				if (!this.lastActionError) {
					this.reportActionError(get(t)('onboarding.completeStep.failed'));
				}
				return false;
			}
			academicContext.applyOnboardingSelection(result.yearId, result.periodId);
			onboardingContext.markSchoolStepSubmitted(result.schoolId);
			onboardingContext.markStructureStepSubmitted();
			onboardingContext.markStaffStepSubmitted();
		}
		else if (authSession.schoolId) {
			const success = await submitCompleteOnboardingStep({
				successMessageKey: options.successMessageKey,
				onError: (message) => {
					this.lastActionError = message;
				},
			});
			if (!success) {
				if (!this.lastActionError) {
					this.reportActionError(get(t)('onboarding.completeStep.failed'));
				}
				return false;
			}
		}
		else {
			// Dev skip without a linked school: local-only completion (no school provisioned).
			onboardingContext.markWizardCompleted();
		}

		onboardingContext.markWizardCompleted();
		if (shouldClearOnboardingDraftAfterFinalize()) {
			onboardingContext.clearStoredDraft();
		}
		else {
			onboardingContext.persist();
		}

		// Prefer linked-app destination after a successful provision; avoid bouncing
		// back to onboarding if resume flags lag behind the just-completed wizard.
		let target = redirectPathIfAuthenticated();
		if (
			shouldProvision
			&& authSession.isLoggedIn
			&& (target == null || target.startsWith(appPath('/onboarding')))
		) {
			target = appPath('/(app)/dashboard');
		}
		persistOnboardingFinalizeDebugSnapshot({
			authUserId: authSession.authUserId,
			schoolId: authSession.schoolId,
			serverStatus: authSession.serverOnboardingStatus,
			draft: onboardingContext.draft,
			redirectTarget: target,
		});
		if (target) {
			appGoto(target, { replaceState: true });
			return true;
		}

		this.reportActionError(get(t)('onboarding.completeStep.redirectFailed'));
		return false;
	}

	async finishOnboarding() {
		if (this.busy) {
			return;
		}

		this.lastActionError = null;
		if (!this.canFinish) {
			this.reportActionError(get(t)('onboarding.completeStep.incomplete'));
			return;
		}

		this.busy = true;
		try {
			const ok = await this.completeAndExitOnboarding({ provision: true });
			if (!ok && !this.lastActionError) {
				this.reportActionError(get(t)('onboarding.completeStep.failed'));
			}
		}
		catch {
			this.reportActionError(get(t)('onboarding.completeStep.failed'));
		}
		finally {
			this.busy = false;
			this.resetProvisionProgress();
		}
	}

	async skipOnboarding() {
		if (this.busy) {
			return;
		}

		this.lastActionError = null;
		if (!this.canSkipOnboarding) {
			this.reportActionError(get(t)('onboarding.completeStep.failed'));
			return;
		}

		this.busy = true;
		try {
			// Skip does not provision from draft; only marks complete when a school already exists.
			const ok = await this.completeAndExitOnboarding({
				successMessageKey: 'onboarding.skipWizardSuccess',
				provision: false,
			});
			if (!ok && !this.lastActionError) {
				this.reportActionError(get(t)('onboarding.completeStep.failed'));
			}
		}
		catch {
			this.reportActionError(get(t)('onboarding.completeStep.failed'));
		}
		finally {
			this.busy = false;
			this.resetProvisionProgress();
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
