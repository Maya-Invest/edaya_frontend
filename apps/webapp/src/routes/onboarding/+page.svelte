<script lang="ts">
	import type { OnboardingStep } from '$lib/onboarding/types';
	import { page } from '$app/stores';
	import { authSession } from '$lib/auth/session.svelte';
	import OnboardingShell from '$lib/components/onboarding/OnboardingShell.svelte';
	import OnboardingStepContent from '$lib/components/onboarding/OnboardingStepContent.svelte';
	import { redirectPathIfAuthenticated } from '$lib/auth/resolve-post-auth';
	import { isOnboardingSkipEnabled } from '$lib/env/app-env';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { onboardingContext } from '$lib/onboarding/context.svelte';
	import {
		canVisitOnboardingStep,
		clampOnboardingStep,
		parseOnboardingStep,
		writeOnboardingStepUrl,
	} from '$lib/onboarding/navigation';
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
	import {
		fetchServerOnboardingAccountStatus,
	} from '$lib/onboarding/sync-account-status';
	import { mergeOnboardingDraftWithServerStatus, persistServerOnboardingStatusToDraft } from '$lib/onboarding/resume-onboarding';

	let busy = $state(false);
	let syncedServerStatus = $state(false);

	const currentStep = $derived(parseOnboardingStep($page.url));
	const maxReachedStep = $derived(onboardingContext.draft.maxReachedStep);
	const stepDefinition = $derived(getOnboardingStepDefinition(currentStep));
	const canAdvance = $derived(canAdvanceFromStep(
		currentStep,
		onboardingContext.draft,
		authSession.loginEmail,
	));
	const canGoBack = $derived(currentStep > 1);
	const nextStep = $derived(nextOnboardingStep(currentStep));
	const showContinue = $derived(currentStep < 4 && nextStep !== null);
	const showFinish = $derived(currentStep === 4);
	const canFinish = $derived(canFinishOnboarding(onboardingContext.draft));
	const showSkip = $derived(Boolean(stepDefinition.optional && nextStep !== null));
	const showSkipOnboarding = $derived(isOnboardingSkipEnabled());
	const canSkipOnboarding = $derived(authSession.isLoggedIn);

	$effect(() => {
		const authUserId = authSession.authUserId;
		if (authUserId) {
			onboardingContext.init(authUserId);
		}
	});

	$effect(() => {
		if (!onboardingContext.initialized) {
			return;
		}

		const requested = parseOnboardingStep($page.url);
		const allowed = clampOnboardingStep(requested, maxReachedStep);
		if (requested !== allowed) {
			appGoto(writeOnboardingStepUrl($page.url, allowed), { replaceState: true });
		}
	});

	$effect(() => {
		if (!onboardingContext.initialized || !authSession.isLoggedIn || syncedServerStatus) {
			return;
		}

		syncedServerStatus = true;

		void (async () => {
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
		})();
	});

	function navigateToStep(step: OnboardingStep) {
		if (!canVisitOnboardingStep(step, maxReachedStep)) {
			return;
		}
		appGoto(writeOnboardingStepUrl($page.url, step));
	}

	function goBack() {
		const previous = previousOnboardingStep(currentStep);
		if (previous) {
			navigateToStep(previous);
		}
	}

	async function goNext() {
		if (!canAdvance || !nextStep || busy) {
			return;
		}

		if (currentStep === 1) {
			busy = true;
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
				onboardingContext.markStepReached(nextStep);
				appGoto(writeOnboardingStepUrl($page.url, nextStep));
			}
			finally {
				busy = false;
			}
			return;
		}

		if (currentStep === 2) {
			busy = true;
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
				onboardingContext.markStepReached(nextStep);
				appGoto(writeOnboardingStepUrl($page.url, nextStep));
			}
			finally {
				busy = false;
			}
			return;
		}

		if (currentStep === 3) {
			busy = true;
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
				onboardingContext.markStepReached(nextStep);
				appGoto(writeOnboardingStepUrl($page.url, nextStep));
			}
			finally {
				busy = false;
			}
			return;
		}

		onboardingContext.markStepReached(nextStep);
		appGoto(writeOnboardingStepUrl($page.url, nextStep));
	}

	function skipStep() {
		if (!stepDefinition.optional || !nextStep) {
			return;
		}
		onboardingContext.markStepReached(nextStep);
		appGoto(writeOnboardingStepUrl($page.url, nextStep));
	}

	async function completeAndExitOnboarding(options?: {
		successMessageKey?: 'onboarding.completeStep.success' | 'onboarding.skipWizardSuccess';
	}): Promise<boolean> {
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

	async function finishOnboarding() {
		if (!canFinish || busy) {
			return;
		}

		busy = true;
		try {
			await completeAndExitOnboarding();
		}
		finally {
			busy = false;
		}
	}

	async function skipOnboarding() {
		if (!canSkipOnboarding || busy) {
			return;
		}

		busy = true;
		try {
			await completeAndExitOnboarding({ successMessageKey: 'onboarding.skipWizardSuccess' });
		}
		finally {
			busy = false;
		}
	}

	async function signOut() {
		busy = true;
		try {
			await authSession.logout();
			onboardingContext.reset();
			appGoto(appPath('/login'), { replaceState: true });
		}
		finally {
			busy = false;
		}
	}
</script>

{#if onboardingContext.initialized}
	<OnboardingShell
		{currentStep}
		{maxReachedStep}
		{canAdvance}
		{canGoBack}
		{showSkip}
		{showContinue}
		{showFinish}
		{canFinish}
		{showSkipOnboarding}
		{canSkipOnboarding}
		{busy}
		onBack={goBack}
		onContinue={() => void goNext()}
		onFinish={() => void finishOnboarding()}
		onSkipOnboarding={() => void skipOnboarding()}
		onSkip={skipStep}
		onStepSelect={navigateToStep}
		onSignOut={() => void signOut()}
	>
		<OnboardingStepContent step={currentStep} {busy} />
	</OnboardingShell>
{/if}
