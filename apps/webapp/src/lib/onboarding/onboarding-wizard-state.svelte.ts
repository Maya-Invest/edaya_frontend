import type { ProvisionProgressStep } from '$lib/onboarding/provision-progress';
import type { OnboardingStep } from '$lib/onboarding/types';
import { academicContext } from '$lib/academic/context.svelte';
import { redirectPathIfAuthenticated } from '$lib/auth/resolve-post-auth';
import { authSession } from '$lib/auth/session.svelte';
import { isOnboardingSkipEnabled } from '$lib/env/app-env';
import { t } from '$lib/i18n';
import { appGoto, appPath, markWizardOnboardingNavigation } from '$lib/navigation/app-navigation';
import { onboardingContext } from '$lib/onboarding/context.svelte';
import {
	persistOnboardingFinalizeDebugSnapshot,
	shouldClearOnboardingDraftAfterFinalize,
} from '$lib/onboarding/debug-storage';
import {
	canVisitOnboardingStep,
	clampOnboardingStep,
	onboardingStepUrl,
	parseOnboardingStep,
} from '$lib/onboarding/navigation';
import {
	getProvisionProgressSteps,
} from '$lib/onboarding/provision-progress';
import {
	mergeOnboardingDraftWithServerStatus,
	shouldHoldOnboardingSummary,
} from '$lib/onboarding/resume-onboarding';
import { staffInvitesForSubmit } from '$lib/onboarding/staff-step-helpers';
import { isValidStaffInviteEmail } from '$lib/onboarding/staff-step-validation';
import {
	canAdvanceFromStep,
	canFinishOnboarding,
	finishOnboardingBlockKey,
	getOnboardingStepDefinition,
	nextOnboardingStep,
	previousOnboardingStep,
} from '$lib/onboarding/steps';
import { submitCompleteOnboardingStep } from '$lib/onboarding/submit-complete-step';
import { submitProvisionOnboarding } from '$lib/onboarding/submit-provision-step';
import { fetchServerOnboardingAccountStatus } from '$lib/onboarding/sync-account-status';
import { toast } from '$lib/toast.svelte';
import { flushSync, getContext, setContext } from 'svelte';
import { get } from 'svelte/store';

const ONBOARDING_WIZARD_STATE_KEY = Symbol('onboarding-wizard-state');

export class OnboardingWizardState {
	busy = $state(false);
	syncedServerStatus = $state(false);
	/** Last wizard-owned step. Survives a delayed post-auth goto back to step 1. */
	private intendedStep = $state<OnboardingStep | null>(null);
	/** Optional phase label while Finish provision is running. */
	provisionPhase = $state<string | null>(null);
	provisionPercent = $state(0);
	provisionActiveStepId = $state<string | null>(null);
	provisionCompletedIds = $state<string[]>([]);
	provisionSteps = $state<Array<Pick<ProvisionProgressStep, 'id' | 'labelKey'>>>([]);
	provisionProgressVisible = $state(false);
	provisionSucceeded = $state(false);
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

	private liveUrl(): URL {
		if (typeof window !== 'undefined') {
			return new URL(window.location.href);
		}
		return this.getUrl();
	}

	get currentStep(): OnboardingStep {
		if (this.intendedStep != null) {
			return this.intendedStep;
		}
		return parseOnboardingStep(this.liveUrl());
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
		return this.currentStep > 1 && !this.provisionSucceeded;
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
		return this.provisionSucceeded
			|| canFinishOnboarding(onboardingContext.draft, authSession.loginEmail);
	}

	get showSkip(): boolean {
		return Boolean(this.stepDefinition.optional && this.nextStep !== null);
	}

	get showSkipOnboarding(): boolean {
		// Skip-to-dashboard is only meaningful after school + classes (steps 1–2).
		return isOnboardingSkipEnabled() && this.currentStep >= 3 && !this.provisionSucceeded;
	}

	get canSkipOnboarding(): boolean {
		return authSession.isLoggedIn && this.currentStep >= 3 && !this.provisionSucceeded;
	}

	initAuthUser(authUserId: string | null) {
		if (authUserId) {
			onboardingContext.init(authUserId);
			this.hydrateIntendedStep();
		}
	}

	private hydrateIntendedStep() {
		if (this.intendedStep != null || !onboardingContext.initialized) {
			return;
		}
		this.intendedStep = this.maxReachedStep;
		if (parseOnboardingStep(this.liveUrl()) !== this.intendedStep) {
			this.writeStepUrl(this.intendedStep);
		}
	}

	private writeStepUrl(step: OnboardingStep) {
		if (typeof window === 'undefined') {
			return;
		}
		const next = new URL(onboardingStepUrl(step), window.location.href);
		if (next.pathname === window.location.pathname && next.search === window.location.search) {
			return;
		}
		markWizardOnboardingNavigation();
		history.replaceState(history.state, '', next);
	}

	private gotoStep(step: OnboardingStep) {
		this.intendedStep = step;
		this.writeStepUrl(step);
	}

	enforceStepAccess() {
		if (!onboardingContext.initialized) {
			return;
		}

		const requested = parseOnboardingStep(this.liveUrl());
		if (this.intendedStep != null && requested < this.intendedStep) {
			this.gotoStep(this.intendedStep);
			return;
		}

		const allowed = clampOnboardingStep(
			requested,
			Math.max(this.maxReachedStep, this.intendedStep ?? 1) as OnboardingStep,
		);
		if (requested > allowed) {
			this.gotoStep(allowed);
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
			if (shouldHoldOnboardingSummary({
				localWizardCompleted: onboardingContext.draft.wizardCompleted,
				provisionProgressVisible: this.provisionProgressVisible,
				provisionSucceeded: this.provisionSucceeded,
			})) {
				this.provisionSucceeded = true;
				return;
			}
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
		if (this.provisionSucceeded || !canVisitOnboardingStep(step, this.maxReachedStep)) {
			return;
		}
		this.gotoStep(step);
	}

	goBack() {
		if (this.provisionSucceeded) {
			return;
		}
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

		// Flush before goto: $page is a store and can notify before $state maxReachedStep
		// is visible, which made enforceStepAccess clamp a legitimate step-2 URL back to 1.
		onboardingContext.markStepReached(next);
		flushSync();
		this.gotoStep(next);
	}

	skipStep() {
		if (!this.stepDefinition.optional || !this.nextStep) {
			return;
		}
		if (this.currentStep === 3) {
			onboardingContext.draft.staffInvites = onboardingContext.draft.staffInvites.filter(
				invite => isValidStaffInviteEmail(invite.email) && Boolean(invite.role),
			);
			onboardingContext.persist();
		}
		onboardingContext.markStepReached(this.nextStep);
		flushSync();
		this.gotoStep(this.nextStep);
	}

	private async runProvision(
		options?: { successMessageKey?: 'onboarding.completeStep.success' | 'onboarding.skipWizardSuccess' },
	): Promise<boolean> {
		this.initProvisionProgress();
		const result = await submitProvisionOnboarding(onboardingContext.draft, {
			successMessageKey: options?.successMessageKey,
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
		this.provisionSucceeded = true;
		return true;
	}

	async openDashboard(): Promise<boolean> {
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
			this.provisionSucceeded
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

	async completeAndExitOnboarding(
		options: {
			successMessageKey?: 'onboarding.completeStep.success' | 'onboarding.skipWizardSuccess';
			provision?: boolean;
		} = {},
	): Promise<boolean> {
		const shouldProvision = options.provision !== false
			&& canFinishOnboarding(onboardingContext.draft, authSession.loginEmail);

		if (shouldProvision) {
			const ok = await this.runProvision({ successMessageKey: options.successMessageKey });
			if (!ok) {
				return false;
			}
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

		return this.openDashboard();
	}

	async finishOnboarding() {
		if (this.busy) {
			return;
		}

		this.lastActionError = null;

		if (this.provisionSucceeded) {
			this.busy = true;
			try {
				const ok = await this.openDashboard();
				if (!ok && !this.lastActionError) {
					this.reportActionError(get(t)('onboarding.completeStep.failed'));
				}
			}
			catch {
				this.reportActionError(get(t)('onboarding.completeStep.failed'));
			}
			finally {
				this.busy = false;
			}
			return;
		}

		const blockKey = finishOnboardingBlockKey(onboardingContext.draft, authSession.loginEmail);
		if (blockKey) {
			this.reportActionError(get(t)(blockKey));
			return;
		}

		onboardingContext.persist();

		this.busy = true;
		try {
			const ok = await this.runProvision();
			if (!ok && !this.lastActionError) {
				this.reportActionError(get(t)('onboarding.completeStep.failed'));
			}
		}
		catch {
			this.reportActionError(get(t)('onboarding.completeStep.failed'));
		}
		finally {
			this.busy = false;
			if (!this.provisionSucceeded) {
				this.resetProvisionProgress();
			}
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
